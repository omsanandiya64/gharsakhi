ALTER TABLE customers ADD CONSTRAINT customers_wallet_nonneg
  CHECK (wallet_paise >= 0);
ALTER TABLE workers ADD CONSTRAINT workers_wallet_nonneg
  CHECK (wallet_paise >= 0);
