import asyncio
import json
import os
import re
import sys
import logging
import warnings
warnings.filterwarnings("ignore")
import pandas as pd
import google.generativeai as genai
from datetime import datetime
from playwright.async_api import async_playwright

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%H:%M:%S'
)

# ==========================================
# 1. محرك الذكاء الاصطناعي (Gemini Analyzer)
# ==========================================
class GeminiMarketAnalyzer:
    def __init__(self, api_key: str):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY", "")
        if self.api_key:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel('gemini-1.5-flash')
        else:
            self.model = None
            logging.warning("⚠️ لم يتم تعيين GEMINI_API_KEY. يرجى تمرير المفتاح لتفعيل التحليل التلقائي.")

    async def analyze_candles(self, candles_df: pd.DataFrame) -> str:
        if not self.model:
            return "⚠️ تعذر التحليل: مفتاح GEMINI_API_KEY غير متوفر."

        if len(candles_df) < 10:
            return "بيانات غير كافية للتحليل (تتطلب 10 شموع على الأقل)."

        # تجهيز آخر 15 شمعة بتنسيق نصي منظم
        recent_candles = candles_df.tail(15).to_string(index=False)
        
        prompt = f"""
أنت خبير تداول متقدم في الخيارات الثنائية (Binary Options) والحركة السعرية (Price Action) لمنصة Quotex.
إليك بيانات آخر الشموع المكتملة للسوق (Open, High, Low, Close, Volume):

{recent_candles}

بناءً على الحركة السعرية ومستويات الدعم والمقاومة والقمم والقيعان الأخيرة:
1. حدد الاتجاه الحالي (Up / Down / Sideways).
2. حدد ما إذا كان هناك نموذج شموع واضح (مثل Pinbar, Engulfing, Hammer, Doji).
3. حدد نقطة الدخول فوراً مع بداية الشمعة القادمة عند الثانية (00s).
4. أعطِ توصية حاسمة للدقيقة القادمة: [CALL] أو [PUT] أو [WAIT] مع نسبة الثقة (%) ومبرر الدخول.
"""
        try:
            response = await asyncio.to_thread(self.model.generate_content, prompt)
            return response.text
        except Exception as e:
            return f"❌ خطأ أثناء استدعاء Gemini: {e}"

# ==========================================
# 2. مدير بيانات السوق والتجميع (Data Buffer)
# ==========================================
class LiveCandleBuffer:
    def __init__(self, max_records=100, local_bridge_url="http://localhost:3000"):
        self.max_records = max_records
        self.local_bridge_url = local_bridge_url
        self.df = pd.DataFrame(columns=["timestamp", "open", "high", "low", "close", "volume"])

    def add_tick_or_candle(self, payload: dict):
        """استخراج وتنظيم بيانات الشمعة من الحمولة المستقبلة"""
        try:
            # معالجة بيانات الشمعة المستقبلة من Quotex
            candle_data = {
                "timestamp": payload.get("time", datetime.now().strftime("%H:%M:%S")),
                "open": float(payload.get("open", payload.get("price", 0))),
                "high": float(payload.get("high", payload.get("price", 0))),
                "low": float(payload.get("low", payload.get("price", 0))),
                "close": float(payload.get("close", payload.get("price", 0))),
                "volume": float(payload.get("volume", 0))
            }

            if candle_data["close"] == 0:
                return
            
            # إضافة الشمعة للجدول
            new_row = pd.DataFrame([candle_data])
            self.df = pd.concat([self.df, new_row], ignore_index=True)
            
            # تقليم القائمة للحفاظ على الأداء
            if len(self.df) > self.max_records:
                self.df = self.df.iloc[-self.max_records:]
                
            logging.info(f"📊 [{candle_data['timestamp']}] السعر اللحظي: {candle_data['close']} | إجمالي الشموع المخزنة: {len(self.df)}")
        except Exception as e:
            pass

# ==========================================
# 3. معترض الـ WebSocket عبر المتصفح (Stream Interceptor)
# ==========================================
class QuotexStreamer:
    def __init__(self, buffer: LiveCandleBuffer, headless=True):
        self.buffer = buffer
        self.headless = headless

    async def handle_frame(self, frame_payload: str):
        """فحص وتحليل حزم الـ WebSocket القادمة من المنصة"""
        try:
            # تصفية أطر Socket.IO الضوئية لبيانات الأسعار والشموع
            if any(k in frame_payload for k in ["candle", "live", "quote", "history", "rates"]):
                # استخراج البيانات الهيكلية من الحزمة
                json_matches = re.findall(r'(\{.*?\})', frame_payload)
                for j_str in json_matches:
                    try:
                        data = json.loads(j_str)
                        if any(k in data for k in ["close", "price", "rate", "open"]):
                            self.buffer.add_tick_or_candle(data)
                    except Exception:
                        pass
        except Exception:
            pass

    async def start(self, target_url: str):
        async with async_playwright() as p:
            logging.info(f"🚀 جاري تشغيل المتصفح (Headless={self.headless})...")
            browser = await p.chromium.launch(
                headless=self.headless,
                args=[
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu'
                ]
            )
            context = await browser.new_context(
                viewport={'width': 1280, 'height': 800},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
            )
            page = await context.new_page()

            # التنصت المباشر على اتصالات الـ WebSocket
            def on_websocket(ws):
                logging.info(f"🔗 [WebSocket متصل]: {ws.url}")
                ws.on("framereceived", lambda frame: asyncio.create_task(self.handle_frame(frame)))

            page.on("websocket", on_websocket)

            logging.info(f"🌐 جاري فتح منصة Quotex: {target_url}")
            try:
                await page.goto(target_url, timeout=60000, wait_until="domcontentloaded")
            except Exception as e:
                logging.warning(f"ملاحظة عند تحميل الصفحة: {e}")

            logging.info("🟢 صفحة Quotex نشطة ويتم التنصت على تدفق الشموع والأسعار اللحظية...")
            
            # إبقاء المتصفح يعمل لاستقبال البيانات المباشرة
            while True:
                await asyncio.sleep(1)

# ==========================================
# 4. المنسق العام (Main Bot Orchestrator)
# ==========================================
async def main():
    gemini_key = os.getenv("GEMINI_API_KEY", "YOUR_GEMINI_API_KEY_HERE")
    quotex_url = os.getenv("QUOTEX_URL", "https://qxbroker.com/ar/trade")
    is_headless = "--headed" not in sys.argv

    logging.info("=" * 55)
    logging.info("👑 HASONE TRADING ▪ QUOTEX WEBSOCKET LIVE ANALYZER")
    logging.info("=" * 55)

    buffer = LiveCandleBuffer(max_records=50)
    analyzer = GeminiMarketAnalyzer(api_key=gemini_key)
    streamer = QuotexStreamer(buffer=buffer, headless=is_headless)

    # مهمة تحليل دورية كل 60 ثانية متزامنة مع إغلاق الشمعة
    async def periodic_analysis():
        while True:
            await asyncio.sleep(60) # التحليل الدوري عند إغلاق الشمعة
            if len(buffer.df) >= 10:
                logging.info("\n" + "="*45)
                logging.info("🤖 إرسال آخر 15 شمعة حية إلى Gemini للتحليل المؤسساتي...")
                logging.info("="*45)
                decision = await analyzer.analyze_candles(buffer.df)
                logging.info(f"\n📈 نتيجة وتوصية التحليل:\n{decision}\n" + "="*45)
            else:
                logging.info(f"⏳ جاري جمع بيانات الشموع... ({len(buffer.df)}/10 شموع متوفرة)")

    # تشغيل سحب البيانات والتحليل بالتوازي عبر asyncio.gather
    await asyncio.gather(
        streamer.start(quotex_url),
        periodic_analysis()
    )

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logging.info("🛑 تم إيقاف البوت يدوياً.")
