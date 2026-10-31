# AQUA-CORE | پلتفرم شبیه‌سازی اتوماسیون فرایندی و Digital Twin

**سامانه مرورگرمحور برای نمایش فرایند، SoftPLC، Structured Text، ابزار دقیق، SCADA و آزمایش پروتکل‌های صنعتی**

> این پروژه آموزشی و مناسب Portfolio است. هیچ تجهیز فیزیکی به آن متصل نیست و این نرم‌افزار PLC، SCADA یا سامانه ایمنی تأییدشده صنعتی محسوب نمی‌شود.

## اجرا بدون نصب

فایل `index.html` را در مرورگر دسکتاپ جدید باز کنید. به نصب Node.js، Python، Docker، نرم‌افزار PLC، پایگاه داده، سرور محلی، CDN یا اتصال اینترنت نیازی نیست. وابستگی خارجی زمان اجرا وجود ندارد. در صورت فعال بودن WebGL، مدل سه‌بعدی بومی مرورگر اجرا می‌شود؛ در غیر این صورت نمای ایزومتریک Canvas به‌عنوان مسیر جایگزین نمایش داده می‌شود.

## انتشار در GitHub Pages

Workflow انتشار در مسیر `.github/workflows/pages.yml` قرار دارد و بدون Build، فایل‌های استاتیک مخزن را منتشر می‌کند.

1. محتوای این پوشه را در شاخه پیش‌فرض `main` یک Repository با نام دلخواه، مثلاً `AQUA-CORE`، قرار دهید.
2. در GitHub وارد **Settings → Pages** شوید.
3. در بخش **Build and deployment → Source** گزینه **GitHub Actions** را انتخاب کنید.
4. با Push به شاخه `main`، Workflow اجرا می‌شود؛ امکان اجرای دستی آن از بخش Actions هم وجود دارد.
5. پس از موفقیت Deploy، نشانی سایت در Environment با نام `github-pages` نمایش داده می‌شود.

راهنمای رسمی: [انتخاب منبع انتشار GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site) و [Workflow سفارشی](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## قابلیت‌ها

- مدل فرایندی مخازن، پمپ‌ها، شیرها، فیلترها، تزریق مواد و شبکه توزیع
- SoftPLC با چرخه اسکن منطقی هدف ۵۰ میلی‌ثانیه؛ نه Real-Time سخت‌گیرانه
- مفسر مستند و محدود Structured Text با Lexer، Parser و Interpreter
- چهار حلقه PID برای Level، Flow، Pressure و pH Proxy
- حالت‌های OFF/AUTO/MANUAL، Interlock و E-STOP شبیه‌سازی‌شده با Trip Latched
- HMI/SCADA شامل نمای فرایند، صفحات تجهیزات، کنترل، آلارم، Historian و Trend
- مدل رجیستر، Coil، Discrete Input، Function Code و MBAP برای Modbus درون‌حافظه‌ای
- مدل اطلاعاتی OPC UA به‌شکل Node/Value/Quality و Browse/Read/Subscribe داخلی
- مدل سه‌بعدی Native WebGL با کنترل دوربین و مسیر جایگزین Canvas 2D
- آزمایشگاه تزریق ۲۷ خطای قابل تکرار
- ۳۱ تست داخلی Unit، Integration و Protocol
- ورود و خروج Session در قالب JSON و خروجی CSV از Historian

## صفحات اصلی

`Plant overview`، `Process mimic`، `Equipment`، `Control loops`، `Packaging cell`، `Alarms & events`، `Trends / historian`، `PLC engineering`، `Communications`، `Fault laboratory`، `Diagnostics` و `Test bench`.

## مرزهای فنی مهم

- زیرمجموعه Structured Text به‌صورت مشخص مستند شده است و انطباق کامل با IEC 61131-3 ادعا نمی‌شود.
- Modbus در این نسخه مدل رجیستر و کدک PDU/MBAP است؛ TCP Socket، Listener روی پورت ۵۰۲ یا ارتباط با دستگاه واقعی وجود ندارد. مرورگر به TCP خام دسترسی مستقیم نمی‌دهد.
- مدل OPC UA شامل Endpoint واقعی یا پروتکل شبکه‌ای OPC UA نیست.
- E-STOP و Interlock صرفاً نرم‌افزاری و شبیه‌سازی‌شده‌اند؛ هیچ ادعای SIL/PL یا اعتبارسنجی ایمنی وجود ندارد.
- مدل فرایند آموزشی و تقریبی است و مبنای طراحی هیدرولیک، دوزینگ شیمیایی یا بهره‌برداری واقعی نیست.
- چرخه ۵۰ ms هدف منطقی است؛ زمان‌بندی تب مرورگر تضمین Real-Time ندارد.

جزئیات معماری، فلسفه کنترل، فهرست I/O و ابزار دقیق، نقشه رجیستر، تست‌ها و محدودیت‌ها در پوشه [`docs/`](docs/) قرار دارد. سند جامع طراحی مهندسی به فارسی در مسیر [`docs/engineering-specification/`](docs/engineering-specification/) و دیاگرام‌های معماری و فرایند در مسیر [`docs/diagrams/`](docs/diagrams/) موجودند.

**سازنده:** Amirhossein Razeghi · مهندسی برق، KNTU
