#!/usr/bin/env python3
import re

# Read the file
with open('C:\\Dev\\yemen-telecom\\server\\src\\routes\\admin\\system.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Define the old and new error messages
# We need to replace INTERNAL_ERROR with the new Arabic messages
# But we need to be careful to only replace specific occurrences

# Pattern 1: /reset route catch block
old1 = "res.status(500).json({ error: 'INTERNAL_ERROR', message: 'حدث خطأ داخلي في الخادم' });"
new1 = "res.status(503).json({ error: 'خدمة الخارة غير متاحة', message: 'تعذر التواصل مع خدمة الخلفية — يرجى إعادة المحاولة لاحقاً' });"

# Pattern 2: /system/backup catch block (first occurrence, around line 83)
old2 = "    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'حدث خطأ داخلي في الخادم' });"
new2 = "    res.status(503).json({ error: 'خدمة الصيانة غير متاحة', message: 'تعذر الوصول لخدمة الصيانة — يرجى المحاولة لاحقاً' });"

# Pattern 3: /system/backup/download catch block
old3 = "    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'حدث خطأ داخلي في الخادم' });"
new3 = "    res.status(503).json({ error: 'خدمة الخارة غير متاحة', message: 'تعذر الوصول لخدمة الخارة — يرجى المحاولة لاحقاً' });"

# Pattern 4: /system/lockdown catch block
old4 = "    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'حدث خطأ داخلي في الخادم' });"
new4 = "    res.status(503).json({ error: 'خدمة الصيانة غير متاحة', message: 'تعذر الوصول لخدمة الصيانة — يرجى المحاولة لاحقاً' });"

# Pattern 5: /system/lockdown/status catch block
old5 = "    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'حدث خطأ داخلي في الخادم' });"
new5 = "    res.status(503).json({ error: 'خدمة الصيانة غير متاحة', message: 'تعذر الوصول لخدمة الصيانة — يرجى المحاولة afterwards' });"

# Pattern 6: /monitoring catch block
old6 = "    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'حدث خطأ داخلي في الخادم' });"
new6 = "    res.status(503).json({ error: 'خدمة الصيانة غير متاحة', message: 'تعذر الوصول لخدمة الصيانة — يرجى المحاولة لاحقاً' });"

# Apply replacements
content = content.replace(old1, new1)
content = content.replace(old2, new2)
content = content.replace(old3, new3)
content = content.replace(old4, new4)
content = content.replace(old5, new5)
content = content.replace(old6, new6)

# Write back
with open('C:\\Dev\\yemen-telecom\\server\\src\\routes\\admin\\system.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("File updated successfully")