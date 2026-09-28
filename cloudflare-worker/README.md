# CREDE.VIP - Clippy Cloudflare Worker Setup

This Cloudflare Worker acts as a secure, serverless edge proxy connecting Clippy on **CREDE.VIP** to OpenRouter's free **`qwen/qwen3.8-27b:free`** model.

It keeps your `OPENROUTER_API_KEY` hidden from public GitHub Pages visitors while restricting requests to your website origin.

---

## 🚀 5-Minute Setup Guide (Via Cloudflare Dashboard)

### 1. Create a Free Cloudflare Account
If you don't already have one, create an account at [dash.cloudflare.com](https://dash.cloudflare.com). The free tier includes **100,000 requests per day**.

### 2. Create the Worker
1. In the Cloudflare dashboard sidebar, go to **Compute (Workers & Pages)** &rarr; **Overview**.
2. Click **Create Application** &rarr; **Create Worker**.
3. Name your worker (e.g. `clippy-api`).
4. Click **Deploy**.

### 3. Paste the Worker Script
1. Click **Edit Code** (top-right of your newly deployed worker).
2. Replace all the placeholder code in `worker.js` with the contents of [`cloudflare-worker/worker.js`](./worker.js).
3. Click **Deploy** in the top right.

### 4. Add Your Secret `OPENROUTER_API_KEY`
1. Navigate back to your worker page and go to the **Settings** tab &rarr; **Variables and Secrets**.
2. Under **Secrets**, click **Add**.
3. Set:
   * **Variable name:** `OPENROUTER_API_KEY`
   * **Value:** Your OpenRouter API key (get one for free at [openrouter.ai/keys](https://openrouter.ai/keys))
4. Click **Deploy** / **Save**.

### 5. Link the Worker URL to Your Website
1. Copy your worker's public URL from the top of the Cloudflare Worker overview (e.g., `https://clippy-api.your-subdomain.workers.dev`).
2. Open [`data/clippy.json`](../data/clippy.json) in this repository.
3. Update the `proxyUrl` field with your URL:
   ```json
   "proxyUrl": "https://clippy-api.your-subdomain.workers.dev"
   ```
4. Save, commit, and push to GitHub:
   ```bash
   git add .
   git commit -m "feat: connect clippy to cloudflare worker"
   git push
   ```

---

## ⚡ Alternative Setup: Wrangler CLI (For Developers)

If you prefer using the terminal:

```bash
# 1. Install Wrangler
npm install -g wrangler

# 2. Login to Cloudflare
wrangler login

# 3. From the cloudflare-worker folder, set your secret key
cd cloudflare-worker
wrangler secret put OPENROUTER_API_KEY
# (Paste your OpenRouter API key when prompted)

# 4. Deploy
wrangler deploy
```

Once deployed, copy the output URL into `data/clippy.json`.

---

## 🛡️ Security & Model Features

* **Free Model:** Uses `qwen/qwen3.8-27b:free` on OpenRouter ($0.00 / token).
* **Speed Optimized:** Configured with `reasoning: { effort: 'low' }` to deliver lightning-fast responses without stalling on reasoning chains.
* **CORS Lockdown:** Only accepts requests originating from `https://crede.vip`, `https://crededalton.github.io`, and `localhost`.
* **Context Aware:** Injects the visitor's currently active window and desktop state so Qwen knows what project or app is on screen.
