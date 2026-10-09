# Security Specification & Test Payloads (ABAC / Zero-Trust Firestore Security)

## 1. Data Invariants
- **License Protection**: Licenses cannot be created or modified directly by unauthenticated clients. Read access to licenses collection is denied to standard public clients; operations are mediated by the server or authenticated admins.
- **Visitor Analytics Isolation**: Visitor logs contain public IP information and session history. Public client SDK reads of `/visitor_sessions` are strictly forbidden. Only authenticated admin sessions or server operations can query or purge sessions.
- **Timestamp Integrity**: All timestamps (firstVisit, lastActivity, firstActivatedAt) must be strictly non-negative numbers and conform to real temporal limits.
- **Path Variable Validation**: Document keys must match strict slug formats (`^[a-zA-Z0-9_\\-]+$`) with a maximum length of 128 characters.
- **Default Deny Catch-All**: Any unspecified collection or path has `allow read, write: if false;`.

## 2. The "Dirty Dozen" Malicious Payloads
1. **Unauthenticated License Creation**: Standard client tries to inject a free lifetime active VIP license into `/licenses/`.
2. **License Status Escalation**: Client attempts to flip status from `revoked` to `active` directly from browser without admin credentials.
3. **Ghost Field Poisoning**: Client attempts to write a License with injected arbitrary root keys (e.g., `{ isSuperAdmin: true }`).
4. **License Code Spoofing**: Attempt to overwrite an existing license with a different duration or owner.
5. **Session ID Traversal**: Malicious client attempts to pass a 50KB string as `{sessionId}` document ID to cause denial of wallet.
6. **Public IP Tampering**: Client tries to directly insert a visitor session claiming an internal network IP `10.0.0.1` or spoofed header.
7. **Direct Visitor Session Dump**: Unauthorized user tries to `list` all documents in `/visitor_sessions` to scrape visitor IP addresses.
8. **Negative Retention Days Injection**: Client attempts to write negative numbers or malicious objects to `/analytics_settings/config`.
9. **Visitor Timestamp Backdating**: Client sends invalid string timestamps instead of epoch numbers.
10. **Device Lock Bypass**: Client attempts to clear `boundIp` and `boundDevice` on an activated license without authorization.
11. **Arbitrary Collection Traversal**: Client attempts to read or write to undefined collections `/system_secrets` or `/passwords`.
12. **Null Token Impersonation**: Request claiming admin access with forged headers without valid admin token/signature.

## 3. Test Runner Invariant Summary
All 12 payloads must be blocked with `PERMISSION_DENIED`. Direct client SDK writes and reads on sensitive collections are prohibited in favor of validated server endpoints with PBKDF2 admin verification and server-side Firestore operations.
