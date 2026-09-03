# Mobile-money wallet logos

Logo files rendered in the landing page "wallets we support" strip
(`Frontend/src/components/sections/landing/ClientsSection.tsx`, fed by
`partnersData` in `Frontend/src/data_files/constants.ts`).

Current files — the `logo` path in `partnersData` must match these names exactly:

| Wallet       | File               |
| ------------ | ------------------ |
| M-Pesa       | `mpesa.svg`        |
| Mixx by Yas  | `mix-by-yas.svg`   |
| Airtel Money | `airtel.svg`       |
| HaloPesa     | `halotel.png`      |

Notes:

- Use full-colour horizontal lockups; trim surrounding whitespace so all four
  optically align (rendered at `h-12` / `sm:h-14`, `max-w-[150px]`).
- No spaces in filenames.
- If you swap a file for a different format, update its `logo` extension in
  `constants.ts`.
