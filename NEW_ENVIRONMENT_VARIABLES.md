# New Production Environment Variables

**Generated**: 2026-06-27  
**Method**: `crypto.randomBytes(64).toString('hex')` for each secret  
**Phase**: Phase 2 — Generate New Production Secrets

---

## Secrets to Replace

### JWT_SECRET (64 bytes → 128 hex chars)
```
JWT_SECRET=6dc547e2bf7ec6730baae9adf2ce2388d4e2d55f9b5f843e145b0bfb8a29e00dc4b5e46967db65425d35746d2dd4c2dd4fc623e2acbf69732a2317ef372951fe
```

### REFRESH_SECRET (64 bytes → 128 hex chars)
```
REFRESH_SECRET=d4819d0dfec2699613672477b8bd228f71133427d9bf10827614c4b0b86c768320956881f718243520f736babcbc549c53c2592dd9cbfcd49fe411dbeaf2a3f2
```

### CSRF_SECRET (64 bytes → 128 hex chars)
```
CSRF_SECRET=4c18198ada66e60b9dd8cd0b7be23de7a2913ebf108b4b1431f86a9ec372993da313a6cf6387c48f602cb7d2d6e0ff99907db6e66cd50e72254d02db57cba0a6
```

### DB_PASSWORD (verified working value)
```
DB_PASSWORD=l5K4PjcFXzR0bWxS
```

---

## Full server/.env File

```
# Server
NODE_ENV=production
API_PORT=4000
CORS_ORIGIN=http://localhost:3000,http://localhost:5173,http://10.0.107.190:3000,http://10.0.0.185:3000,http://10.0.110.6:3000,https://yemen-telecom-1699.web.app

# Database (Supabase Pooler)
DB_HOST=aws-1-ap-southeast-1.pooler.supabase.com
DB_PORT=5432
DB_USER=postgres.qxroquilskugfemzmrzp
DB_PASSWORD=l5K4PjcFXzR0bWxS
DB_NAME=postgres
DB_SSL_REJECT_UNAUTHORIZED=false

# Auth Secrets (NEW — generated 2026-06-27)
JWT_SECRET=6dc547e2bf7ec6730baae9adf2ce2388d4e2d55f9b5f843e145b0bfb8a29e00dc4b5e46967db65425d35746d2dd4c2dd4fc623e2acbf69732a2317ef372951fe
REFRESH_SECRET=d4819d0dfec2699613672477b8bd228f71133427d9bf10827614c4b0b86c768320956881f718243520f736babcbc549c53c2592dd9cbfcd49fe411dbeaf2a3f2
CSRF_SECRET=4c18198ada66e60b9dd8cd0b7be23de7a2913ebf108b4b1431f86a9ec372993da313a6cf6387c48f602cb7d2d6e0ff99907db6e66cd50e72254d02db57cba0a6

# Firebase Admin
FIREBASE_STORAGE_BUCKET=yemen-telecom-1699.appspot.com
FIREBASE_PROJECT_ID=yemen-telecom-1699
FIREBASE_PRIVATE_KEY_ID=edd79b510bb9b3c9a1dedbba0d0a11c2ad6170dd
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDJo4ssm52tQiA7\nNI2Klc4xCTWrvdb3tP4pa77EZIfCkXVJM7GY6/cD9LcbkUYRb/dpSnfU+CSGt1WH\nDuqjeyAAwyyW+GVTVagKmTTszmSSaDV0SjG+AqYBBC8IGTG1yiMyWBARwlx9Hjs0\n4cq6U1cOq7jJAcfA2oS8Jy64ldh4FHmR5/HYADP+4J/Fq65RReVvO3P2D91/7C+c\nUEsjW9L7JAdiEjUyLEOA493aXZ7O96097YxuXmNS2tCcgN2XgDXYWBd5hDhA2xKC\nNeeSPa5dUUgBVjHxjI7HMDrra87yT6VwxpZm6zWb8IrS6hKH6aoL2jQusdX7YFFX\nQIctX74PAgMBAAECggEABIoBPr25qAyDIKIQ7GvT5CGypIBin7/iZGwcmfVjYvtj\nejetY0v7vj1aukZw0kERfwkvA/6abLGHpA5imzYd2DaMjeqrwttjElE0y+UXhksA\n2dkDudgu0XrWuv/W/e8kQxfDzaQkJELmdUz+tpp14FderDobu4xcjMaOOpe3Wd8E\nR79Z1gylmlpGombAWK+d8NK0BCv/BXa2822DHVw4wFuQ26YusqkASQhAiRjg7HZa\noLLQdISk7tq/bY3W2VMIa+gD47C3K3bL1jI0CgXSSVnlVwovIc91RX6YgmnKAoqp\nI7biLZVCtrdsqnc1neMetm1HVC98zc3BUnx7NL9PnQKBgQDvZPxc/R3qN7CdCZy+\nRSFkWkQ23ffNaCYI7in/3AQl/v6p/KftI0I5rTHAAropwoQ0ClBQckt1oDOtm0cH\nJEvKaArY7fj0q/E0ygCXgZzujN42/TfuOadghW/AVpbkmg1ivj/FpTZCoJNLCh96\noPjPmMLv3v91Y8qFT/oHavClewKBgQDXoB4P/NQD87wdwZijV+RmWi1I2JUAWAYT\nJsXFyptq4DkTDkyQ5XEwONYg3tZZI40NeAKUlJWVThB4B//COTLm7c4n84k9nbMi\n8ItoxS+/spJauRCc8gKYnjGdpiZPvzLJFCWyA5ZSnW3XUxgk8WpR9vzu/usjjELZ\nFmxl5kODfQKBgQCTa5bVFLJlV6IVMqQpr5yelc/IEezVuzsg6LlIbI7JbzwYJhSr\nPbk8l2E5ovRNXxHWkjtfLuM1LlBkqmiVB078+BEmAXX8Bh5lqbevlQu1A16cclcN\nBsgB8modAbWuVQfFNO9EoTbG1OefoD4+X/6YqLPyz1p1SdyfN976zmofHQKBgH4g\nk9UoP+A77xq8xoste1V/hCOrRKUZ2BvVvzPuSrDejaQe5hyPiYD6jg5WKq2jhPuO\n6nt82m6mZi3ACBPVH3hDPCbUZr/bAhD7AaD8TuzkCIX24MfdLDWXu1ALAzf8kDlc\nhpw1SvXyTnD4kxPw/w8I2XT3OhXmEqgnXKrSYUWFAoGAB2aGj+6bgTjyJ7viB0FV\n41tAlrmc1ZeBhV0HsnhGsGtVRy++bXQWiZKxMeht14jwQjYlKn9XjgRIO25hMPfO\nkqwfIfph8EbojCkObL7nCCyKMiQzibEQir4sOOj5uw/AisAdFTaZ2kYSVuMJhmmp\nuXPYetOa/hCnrIts8uH+KYo=\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-admin-sa@yemen-telecom-1699.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=102334222892672559637
FIREBASE_CLIENT_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-admin-sa%40yemen-telecom-1699.iam.gserviceaccount.com
```

---

## Render Environment Variables to Update

| Key | New Value | Old Value (Leaked) |
|-----|-----------|-------------------|
| `DB_PASSWORD` | `l5K4PjcFXzR0bWxS` | `sRPzEKEfR3uaeM#` |
| `JWT_SECRET` | `6dc547e2...` (128 hex) | `de641af8...` (128 hex) |
| `REFRESH_SECRET` | `d4819d0d...` (128 hex) | `51be9abf...` (128 hex) |
| `CSRF_SECRET` | `4c18198a...` (128 hex) | `3d17e0ed...` (128 hex) |

## Verification

```
JWT_SECRET entropy:     512 bits
REFRESH_SECRET entropy:  512 bits
CSRF_SECRET entropy:     512 bits
```

All secrets generated via cryptographically secure `crypto.randomBytes(64)`.
