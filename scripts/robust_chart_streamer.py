"""
Robust Chart Streamer (Producer-Consumer WebSocket Architecture)
================================================================
معمارية متقدمة مبنية بـ Python مع مكتبة asyncio و websockets:
- المُنتِج (Producer): الاتصال اللحظي وإعادة الاتصال الذكي (Exponential Backoff).
- طابور البيانات (asyncio.Queue): فصل تام بين الاستقبال والمعالجة بدون تأخير (Non-blocking).
- المُستهلِك (Consumer): تنقية وفلترة حزم Socket.IO و استخراج بيانات شموع كوتكس OTC.
- الجسر المباشر (Bridge): إمكانية تمرير البيانات لحظياً إلى سيرفر المنصة.
"""

import asyncio
import json
import logging
import sys
import warnings
warnings.filterwarnings("ignore")
from datetime import datetime
from typing import Optional

import websockets

# إعداد السجلات لتتبع حالة الاتصال
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [%(levelname)s] - %(message)s',
    datefmt='%H:%M:%S'
)


class RobustChartStreamer:
    def __init__(self, wss_url: str, subscription_payload: Optional[dict] = None, bridge_url: Optional[str] = None):
        self.wss_url = wss_url
        self.subscription_payload = subscription_payload
        self.bridge_url = bridge_url
        # طابور البيانات (Queue) لضمان عدم ضياع أي شمعة أثناء التحليل
        self.data_queue = asyncio.Queue()
        self.is_running = False

    # ==========================================
    # 1. المُنتِج (Producer): مسؤول عن الاتصال والاستقبال فقط
    # ==========================================
    async def connect_and_listen(self):
        reconnect_delay = 1  # ثانية واحدة للبدء
        
        while self.is_running:
            try:
                logging.info(f"🔄 جاري الاتصال بخادم الشارت: {self.wss_url}")
                
                # استخدام ping_interval للحفاظ على الاتصال حياً (Keep-Alive)
                async with websockets.connect(self.wss_url, ping_interval=20, ping_timeout=20) as ws:
                    logging.info("🟢 تم الاتصال بالشارت بنجاح!")
                    reconnect_delay = 1  # تصفير تأخير إعادة الاتصال بعد النجاح
                    
                    # إرسال كود الاشتراك في الأصل المالي (إن وجد)
                    if self.subscription_payload:
                        await ws.send(json.dumps(self.subscription_payload))
                        logging.info("📤 تم إرسال طلب اشتراك الشارت.")

                    # حلقة الاستماع اللحظية (تستقبل البيانات فور حدوثها)
                    async for message in ws:
                        # نضع الرسالة في الطابور بدلاً من معالجتها هنا لتجنب تأخير الاستقبال (Non-blocking)
                        await self.data_queue.put(message)
                        
            except websockets.exceptions.ConnectionClosed as e:
                logging.warning(f"🔴 انقطع الاتصال بالسيرفر. الكود: {e.code}")
            except Exception as e:
                logging.error(f"❌ حدث خطأ في الاتصال: {e}")
            
            # نظام إعادة الاتصال الذكي (Exponential Backoff)
            if self.is_running:
                logging.info(f"⏳ جاري إعادة المحاولة بعد {reconnect_delay} ثانية...")
                await asyncio.sleep(reconnect_delay)
                reconnect_delay = min(reconnect_delay * 2, 60)  # مضاعفة الوقت حتى 60 ثانية كحد أقصى

    # ==========================================
    # 2. المُستهلِك (Consumer): مسؤول عن فلترة الشموع وتحليلها
    # ==========================================
    async def process_data(self):
        while self.is_running:
            # يسحب الرسالة من الطابور فور توفرها
            message = await self.data_queue.get()
            
            try:
                # ----------------------------------------------------
                # ملاحظة: منصات مثل Quotex تستخدم Socket.IO عبر WebSockets
                # عادة تبدأ رسائلهم بأرقام مثل "42" قبل الـ JSON. 
                # هذا الفلتر لتنظيف الرسالة إذا كانت Socket.IO
                # ----------------------------------------------------
                if isinstance(message, str) and message.startswith("42"):
                    message = message[2:]  # إزالة الـ 42
                
                # تحويل النص إلى قاموس بايثون (JSON)
                data = json.loads(message)
                
                # ------ [ معالجة بيانات الشارت والشموع ] ------
                time_now = datetime.now().strftime('%H:%M:%S.%f')[:-3]
                
                # حالة 1: حزم Socket.IO على شكل مصفوفة [event, payload]
                if isinstance(data, list) and len(data) > 1:
                    event_name = data[0]
                    event_data = data[1]
                    
                    if event_name in ["candle", "tick", "quote"] or (isinstance(event_data, dict) and "close" in event_data):
                        price = event_data.get('close') or event_data.get('price')
                        logging.info(f"📊 [شارت كوتكس] الوقت: {time_now} | السعر اللحظي: {price}")

                # حالة 2: حزم الشموع المباشرة بصيغة كائن (Binance / Quotex Feed)
                elif isinstance(data, dict):
                    # دعم نمط kline القياسي
                    if 'k' in data:
                        kline = data['k']
                        close_p = kline.get('c')
                        open_p = kline.get('o')
                        high_p = kline.get('h')
                        low_p = kline.get('l')
                        is_closed = kline.get('x', False)
                        status_str = "إغلاق شمعة ✅" if is_closed else "شمعة جارية ⏳"
                        logging.info(f"📊 [شارت لحظي] {time_now} | O: {open_p} | C: {close_p} | H: {high_p} | L: {low_p} [{status_str}]")
                    elif 'close' in data or 'price' in data:
                        price = data.get('close', data.get('price'))
                        logging.info(f"📊 [شارت مباشر] الوقت: {time_now} | السعر: {price}")
                        
            except json.JSONDecodeError:
                # تجاهل رسائل الاتصال غير المهمة (مثل رسائل الـ Ping 2/3)
                pass
            except Exception as e:
                logging.error(f"خطأ في معالجة البيانات: {e}")
            finally:
                # إعلام الطابور بانتهاء معالجة هذه الرسالة
                self.data_queue.task_done()

    # ==========================================
    # 3. محرك التشغيل (Orchestrator)
    # ==========================================
    async def start(self):
        self.is_running = True
        logging.info("🚀 بدء تشغيل محرك الشارت والـ WebSocket...")
        
        # تشغيل مهمة الاستقبال ومهمة المعالجة بالتوازي معاً
        await asyncio.gather(
            self.connect_and_listen(),
            self.process_data()
        )

    def stop(self):
        self.is_running = False
        logging.info("🛑 جاري إيقاف الاتصال بأمان...")


# ==========================================
# منطقة التشغيل الرئيسية
# ==========================================
if __name__ == "__main__":
    # يمكن تمرير رابط WSS كمعامل سطر أوامر أو استخدام البث المباشر
    wss_url = sys.argv[1] if len(sys.argv) > 1 else "wss://stream.binance.com:9443/ws/btcusdt@kline_1m"
    payload = None

    logging.info("=" * 60)
    logging.info("👑 ROBUST CHART STREAMER ▪ PRODUCER-CONSUMER QUEUE ENGINE")
    logging.info("=" * 60)

    streamer = RobustChartStreamer(wss_url, payload)

    try:
        asyncio.run(streamer.start())
    except KeyboardInterrupt:
        streamer.stop()
