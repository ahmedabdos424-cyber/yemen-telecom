# Privacy Policy Deployment Guide

**Project:** Yemen Telecom SIM Management System
**File:** `privacy-policy.html` (Arabic, RTL)
**Purpose:** Google Play Data Safety section requires a publicly accessible privacy policy URL.

---

## Option 1: GitHub Pages (Recommended — Free)

### Setup
1. Push `privacy-policy.html` to your GitHub repository root
2. Go to repository **Settings > Pages**
3. Source: **Deploy from a branch**
4. Branch: `main` / `master`, folder: `/ (root)`
5. Save — URL will be:

```
https://<username>.github.io/<repository>/privacy-policy.html
```

### Custom Domain (Optional)
Add a `CNAME` file with your domain and configure DNS.

---

## Option 2: Netlify (Free)

### Setup
1. Drag & drop `privacy-policy.html` to https://app.netlify.com/drop
2. Or connect your GitHub repo

### Result
```
https://<random-name>.netlify.app/privacy-policy.html
```

You can customize the subdomain in **Site settings > Domain management**.

---

## Option 3: Cloudflare Pages (Free)

### Setup
1. Go to **Cloudflare Dashboard > Pages**
2. Click **Create a project > Direct Upload**
3. Upload `privacy-policy.html`
4. Deploy

### Result
```
https://<project-name>.pages.dev/privacy-policy.html
```

---

## Option 4: Firebase Hosting (Free tier)

### Setup
```bash
npm install -g firebase-tools
firebase init hosting
# Set public directory to . (or a folder)
# Copy privacy-policy.html to public/
firebase deploy --only hosting
```

### Result
```
https://<project-id>.web.app/privacy-policy.html
```

---

## Final URL for Google Play Console

After deploying with any method above, enter this URL in:

**Google Play Console > App content > Data Safety > Privacy Policy**

```
https://<your-domain>/privacy-policy.html
```

---

## Verification Checklist

- [ ] URL is publicly accessible (test in incognito/private browser)
- [ ] Page renders correctly on mobile devices
- [ ] All 10 sections from `privacy-policy.md` are present
- [ ] Arabic RTL text displays correctly
- [ ] HTTPS is enforced (all free hosts above provide HTTPS automatically)
- [ ] Last updated date is current (June 16, 2026)
