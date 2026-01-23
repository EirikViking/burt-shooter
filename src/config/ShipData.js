/**
 * Single source of truth for all ship data.
 * Unifies UI metadata (names, lore) and Gameplay constants (stats, hitboxes).
 * 
 * DESIGN NOTE:
 * These stats are the FINAL effective values used in gameplay.
 * For example, if a ship has multiple bullets, the 'damage' listed here
 * is the damage per bullet.
 */

import { t } from '../i18n/index.ts';

export const ShipData = [
    {
        id: 'rank_ship_0',
        spriteKey: 'row2_ship_1.png',
        textureIndex: 0,
        get name() { return t('ship.rank_ship_0.name'); },
        get description() { return t('ship.rank_ship_0.description'); },
        get loreShort() { return t('ship.rank_ship_0.loreShort'); },
        get loreLong() { return t('ship.rank_ship_0.loreLong'); },
        stats: {
            speed: 5.5, // Base 5.5 * 1.0
            fireRate: 160, // Base 160 * 1.0
            damage: 1.1, // Base 1 * 1.1 (Precision profile)
            bulletSpeed: 10
        },
        weapon: {
            bullets: 1,
            spread: 0,
            shootSfx: 'shoot_small'
        },
        visuals: { scale: 0.15, idleAmplitude: 2, idleSpeed: 0.05, tiltMax: 0.2, tiltSpeed: 0.1 },
        hitbox: { radius: 12 }
    },
    {
        id: 'rank_ship_1',
        spriteKey: 'row2_ship_2.png',
        textureIndex: 1,
        get name() { return t('ship.rank_ship_1.name'); },
        get description() { return t('ship.rank_ship_1.description'); },
        get loreShort() { return t('ship.rank_ship_1.loreShort'); },
        get loreLong() { return t('ship.rank_ship_1.loreLong'); },
        stats: {
            speed: 6, // Base 6 * 1.0
            fireRate: 157.5, // Base 150 * 1.05 (Double profile)
            damage: 0.85, // Base 1 * 0.85
            bulletSpeed: 10
        },
        weapon: {
            bullets: 2,
            spread: 0.14,
            shootSfx: 'shoot_small'
        },
        visuals: { scale: 0.15, idleAmplitude: 2, idleSpeed: 0.05, tiltMax: 0.2, tiltSpeed: 0.1 },
        hitbox: { radius: 12 }
    },
    {
        id: 'rank_ship_2',
        spriteKey: 'row2_ship_3_clean.png',
        textureIndex: 2,
        get name() { return t('ship.rank_ship_2.name'); },
        get description() { return t('ship.rank_ship_2.description'); },
        get loreShort() { return t('ship.rank_ship_2.loreShort'); },
        get loreLong() { return t('ship.rank_ship_2.loreLong'); },
        stats: {
            speed: 7.15, // Base 6.5 * 1.1 (Rapid profile)
            fireRate: 108.75, // Base 145 * 0.75
            damage: 0.9, // Base 1 * 0.9
            bulletSpeed: 12.1 // Base 11 * 1.1
        },
        weapon: {
            bullets: 1,
            spread: 0,
            shootSfx: 'shoot_small'
        },
        visuals: { scale: 0.15, idleAmplitude: 2, idleSpeed: 0.05, tiltMax: 0.2, tiltSpeed: 0.1 },
        hitbox: { radius: 12 }
    },
    {
        id: 'rank_ship_3',
        spriteKey: 'row2_ship_5.png',
        textureIndex: 3,
        get name() { return t('ship.rank_ship_3.name'); },
        get description() { return t('ship.rank_ship_3.description'); },
        get loreShort() { return t('ship.rank_ship_3.loreShort'); },
        get loreLong() { return t('ship.rank_ship_3.loreLong'); },
        stats: {
            speed: 6.3, // Base 7 * 0.9 (Heavy profile)
            fireRate: 168, // Base 140 * 1.2
            damage: 1.4, // Base 1 * 1.4
            bulletSpeed: 9.9 // Base 11 * 0.9
        },
        weapon: {
            bullets: 1,
            spread: 0,
            shootSfx: 'shoot_heavy'
        },
        visuals: { scale: 0.15, idleAmplitude: 2, idleSpeed: 0.05, tiltMax: 0.2, tiltSpeed: 0.1 },
        hitbox: { radius: 12 }
    },
    {
        id: 'rank_ship_4',
        spriteKey: 'ship_extract_1.png',
        textureIndex: 4,
        get name() { return t('ship.rank_ship_4.name'); },
        get description() { return t('ship.rank_ship_4.description'); },
        get loreShort() { return t('ship.rank_ship_4.loreShort'); },
        get loreLong() { return t('ship.rank_ship_4.loreLong'); },
        stats: {
            speed: 6.3, // Base 6 * 1.05 (Arc profile)
            fireRate: 150, // Base 150 * 1.0
            damage: 1.2, // Base 1.2 (keeping UI promise) * 1.0 (removing nerfs). Buffed from 0.96.
            bulletSpeed: 12 // Base 12 * 1.0
        },
        weapon: {
            bullets: 2,
            spread: 0.2,
            shootSfx: 'shoot_small'
        },
        visuals: { scale: 0.15, idleAmplitude: 2, idleSpeed: 0.05, tiltMax: 0.2, tiltSpeed: 0.1 },
        hitbox: { radius: 12 }
    },
    {
        id: 'rank_ship_5',
        spriteKey: 'ship_extract_2.png',
        textureIndex: 5,
        get name() { return t('ship.rank_ship_5.name'); },
        get description() { return t('ship.rank_ship_5.description'); },
        get loreShort() { return t('ship.rank_ship_5.loreShort'); },
        get loreLong() { return t('ship.rank_ship_5.loreLong'); },
        stats: {
            speed: 6.0, // Base 5 * 1.2 (Sniper profile)
            fireRate: 207, // Base 180 * 1.15
            damage: 2.5, // Base 2 * 1.25
            bulletSpeed: 12 // Base 10 * 1.2
        },
        weapon: {
            bullets: 1,
            spread: 0,
            shootSfx: 'shoot_heavy'
        },
        visuals: { scale: 0.15, idleAmplitude: 2, idleSpeed: 0.05, tiltMax: 0.2, tiltSpeed: 0.1 },
        hitbox: { radius: 13 }
    },
    {
        id: 'rank_ship_6',
        spriteKey: 'ship_extract_3.png',
        textureIndex: 6,
        get name() { return t('ship.rank_ship_6.name'); },
        get description() { return t('ship.rank_ship_6.description'); },
        get loreShort() { return t('ship.rank_ship_6.loreShort'); },
        get loreLong() { return t('ship.rank_ship_6.loreLong'); },
        stats: {
            speed: 7.5, // Base 7.5 * 1.0 (Spray profile)
            fireRate: 165, // Base 150 * 1.1
            damage: 0.7, // Base 1 * 0.7
            bulletSpeed: 11 // Base 11 * 1.0
        },
        weapon: {
            bullets: 3,
            spread: 0.22,
            shootSfx: 'shoot_small'
        },
        visuals: { scale: 0.15, idleAmplitude: 2, idleSpeed: 0.05, tiltMax: 0.2, tiltSpeed: 0.1 },
        hitbox: { radius: 12 }
    },
    {
        id: 'rank_ship_7',
        spriteKey: 'ship_extract_5.png',
        textureIndex: 7,
        get name() { return t('ship.rank_ship_7.name'); },
        get description() { return t('ship.rank_ship_7.description'); },
        get loreShort() { return t('ship.rank_ship_7.loreShort'); },
        get loreLong() { return t('ship.rank_ship_7.loreLong'); },
        stats: {
            speed: 6, // Base 6 * 1.0 (Steady profile)
            fireRate: 126, // Base 140 * 0.9
            damage: 1, // Base 1 * 1.0
            bulletSpeed: 10 // Base 10
        },
        weapon: {
            bullets: 1,
            spread: 0,
            shootSfx: 'shoot_small'
        },
        visuals: { scale: 0.15, idleAmplitude: 2, idleSpeed: 0.05, tiltMax: 0.2, tiltSpeed: 0.1 },
        hitbox: { radius: 12 }
    },
    {
        id: 'rank_ship_8',
        spriteKey: 'ship_new.png',
        textureIndex: 8,
        get name() { return t('ship.rank_ship_8.name'); },
        get description() { return t('ship.rank_ship_8.description'); },
        get loreShort() { return t('ship.rank_ship_8.loreShort'); },
        get loreLong() { return t('ship.rank_ship_8.loreLong'); },
        stats: {
            speed: 6, // Base 6 * 1.0 (Balanced profile)
            fireRate: 142.5, // Base 150 * 0.95
            damage: 0.95, // Base 1 * 0.95
            bulletSpeed: 10 // Base 10
        },
        weapon: {
            bullets: 2,
            spread: 0.12,
            shootSfx: 'shoot_small'
        },
        visuals: { scale: 0.15, idleAmplitude: 2, idleSpeed: 0.05, tiltMax: 0.2, tiltSpeed: 0.1 },
        hitbox: { radius: 12 }
    }
];
