/*
 * Lectura de los tokens de color de styles/tokens.css desde JavaScript.
 *
 * Invariante 14 del proyecto: ningún color literal en JS. Cuando el motor
 * necesita un color (fondo de cámara, material de un marcador), lo lee de
 * aquí, que a su vez lo lee de la hoja de tokens.
 */
import { Color } from 'playcanvas';

/** Valor CSS crudo de un token (por ejemplo '#6FCF97'). */
export function cssFromToken(tokenName, fallback = '') {
    return getComputedStyle(document.documentElement).getPropertyValue(tokenName).trim() || fallback;
}

/** El token convertido a Color de PlayCanvas. Solo tokens en formato #RRGGBB. */
export function colorFromToken(tokenName) {
    const hex = cssFromToken(tokenName);
    const value = parseInt(hex.slice(1), 16);
    return new Color(((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255);
}
