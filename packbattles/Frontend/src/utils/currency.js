/**
 * Pack Coins formatting helpers.
 *
 * fmtPackCoins()      → "2,500 Pack Coins"   (default for all user-facing displays)
 * fmtPackCoinsShort() → "2,500 PC"           (only for cramped UI spots where the full
 *                                              label does not fit, e.g. battle card chips)
 *
 * Neither helper touches the underlying numeric value — display-only.
 */

export function fmtPackCoins(value) {
    return `${Number(value).toLocaleString()} Pack Coins`;
}

export function fmtPackCoinsShort(value) {
    return `${Number(value).toLocaleString()} PC`;
}
