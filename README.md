# SaintCAT Trades

A personal CS2 skin trading tracker built for serious traders who want full control over their profits.

## Features

- **Trade tracking** — log every skin with name, type, wear, float, pattern, buy/sell platform and price
- **Automatic profit calculation** — dirty and net profit per trade with platform fees applied
- **Three tabs** — Trades, Withdrawals, Deposits
- **Withdrawal logic** — tracks available balance per platform based on sales, deposits and previous withdrawals
- **Deposit tracking** — log funds added to platform wallets from external sources
- **Statistics panel** — Invested, Sold, Profit, Pending, Deposited, Withdrawn, Total Capital
- **Sorting** — click any column header to sort ascending/descending
- **Skin autocomplete** — 2000+ CS2 skins loaded from API with instant search
- **Float ↔ Condition sync** — automatically updates wear when float is typed and vice versa
- **CSV export/import** — backup and restore your trades
- **Admin panel** — view all users and their statistics (owner only)

## Platform Fees

| Platform | Trade | Withdrawal |
|----------|-------|------------|
| CS.MONEY | 5% + 1.5% | $1.2 per withdrawal |
| CSFloat  | 2%         | Free |
| Buff163  | 2.5%       | Free |

## Tech Stack

- Vanilla JS / HTML / CSS — no frameworks
- Firebase Realtime Database
- Google Authentication
- Hosted on GitHub Pages
