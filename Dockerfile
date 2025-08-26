# المرحلة الأولى: بناء التطبيق وتثبيت الاعتماديات
# استخدام إصدار أحدث ومستقر من Node.js
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
# تثبيت الاعتماديات اللازمة للإنتاج فقط
RUN npm install --only=production

# المرحلة الثانية: إعداد بيئة التشغيل النهائية
# استخدام نفس الإصدار لضمان التوافق
FROM node:22-alpine
WORKDIR /app
# نسخ الاعتماديات من مرحلة البناء
COPY --from=builder /app/node_modules ./node_modules
# نسخ ملف الكود الرئيسي فقط
COPY app.js .

# الأمر الافتراضي لتشغيل البوت عند بدء الحاوية
CMD ["node", "app.js"]