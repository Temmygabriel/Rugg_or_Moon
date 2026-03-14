# 🪤🚀 Rug or Moon — GenLayer Party Game

> AI drops a fake crypto project. You call RUG or MOON. The oracle reveals the truth.

Built on **GenLayer** — AI consensus on-chain.

---

## 🚀 Deploy in 3 Steps

### Step 1 — Deploy the contract
1. Go to [GenLayer Studio](https://studio.genlayer.com)
2. Paste everything from `rug_or_moon_contract.py`
3. Click **Deploy** → copy the `0x...` address

### Step 2 — Add your contract address
Open `app/page.tsx` and find **line ~10**:
```ts
const CONTRACT_ADDRESS = "PASTE_YOUR_CONTRACT_ADDRESS_HERE";
```
Replace with your real address. Commit.

### Step 3 — Deploy to Vercel
Push to GitHub → vercel.com → Import repo → **Framework: Next.js** → Deploy ✅

---

## 🎮 How to Play

| Step | What happens |
|------|-------------|
| Player 1 creates a game | AI generates a fake crypto project with green & red flags |
| Player 1 shares the Game ID | Player 2 enters it to join |
| Both players call **RUG 🪤 or MOON 🚀** | Then write one sentence defending the call |
| **AI Oracle decides** | Picks which outcome happened based on the better argument |
| First to **3 correct calls** wins | Full history with all verdicts shown |

---

## 📁 Structure
```
app/
  layout.tsx
  page.tsx          ← Edit CONTRACT_ADDRESS here
public/logo/
  mark.svg
  logo.svg
rug_or_moon_contract.py
package.json
```

Built for the **GenLayer Playverse Challenge** 🏆
