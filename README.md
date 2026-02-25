# Avshalom Event Site

אתר אירוע סטטי עם שרת Node קטן (`index.js`) ועמוד ראשי (`index.html`).

## הרצה מקומית

```powershell
npm install
npm run dev
```

פתחו בדפדפן: `http://localhost:3000`

## מה השתנה לגבי וידאו

- הוסר שימוש בקבצי MP4 מקומיים מתוך הקוד.
- הווידאו מוטמע דרך YouTube Embed (Unlisted) במקום `public/videos/*.mp4`.
- אם אין חיבור אינטרנט או שאין URL תקין, מוצגת הודעת fallback במקום שבירת מסך.

## עדכון VIDEO_ID של YouTube

1. פתחו את [index.html](./index.html).
2. מצאו את המשתנה:
   `const YOUTUBE_WATCH_URL = 'https://www.youtube.com/watch?v=AvxPVFt9nlE';`
3. החליפו ל־URL החדש שלכם (Unlisted).
4. רעננו את הדף.

## דיפלוי / Push ל-GitHub

- התיקיות `public/videos` ו-`public/sequence` מוחרגות ב-`.gitignore`.
- לאחר שינויי קוד:

```powershell
git add .
git commit -m "Update site to YouTube embeds and remove large media from git"
git push -u origin main
```

