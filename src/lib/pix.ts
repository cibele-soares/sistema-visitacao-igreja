function removeAccents(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeField(value: string, maxLength: number): string {
  return removeAccents(value).toUpperCase().replace(/[^A-Z0-9 .-]/g, "").slice(0, maxLength);
}

function tlv(id: string, value: string): string {
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

function crc16Ccitt(value: string): string {
  let crc = 0xffff;
  for (let index = 0; index < value.length; index += 1) {
    crc ^= value.charCodeAt(index) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function createPixPayload(key: string, merchantName: string, merchantCity: string, txid = "***"): string {
  const cleanKey = key.trim();
  if (!cleanKey) throw new Error("A chave PIX não pode ficar vazia.");

  const merchantAccount = tlv("00", "BR.GOV.BCB.PIX") + tlv("01", cleanKey);
  const additionalData = tlv("05", normalizeField(txid, 25) || "***");
  const payloadWithoutCrc = [
    tlv("00", "01"),
    tlv("26", merchantAccount),
    tlv("52", "0000"),
    tlv("53", "986"),
    tlv("58", "BR"),
    tlv("59", normalizeField(merchantName, 25) || "IGREJA"),
    tlv("60", normalizeField(merchantCity, 15) || "BRASIL"),
    tlv("62", additionalData),
    "6304",
  ].join("");

  return payloadWithoutCrc + crc16Ccitt(payloadWithoutCrc);
}
