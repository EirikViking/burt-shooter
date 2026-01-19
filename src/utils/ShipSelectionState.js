/**
 * Ship Selection State Manager
 * Single source of truth for currently selected ship
 */

let currentSelectedShipKey = null;

export function getSelectedShipKey() {
    return currentSelectedShipKey;
}

export function setSelectedShipKey(spriteKey) {
    currentSelectedShipKey = spriteKey;
    console.log('[ShipSelectionState] Set selected ship:', spriteKey);
}

export function clearSelectedShipKey() {
    currentSelectedShipKey = null;
}
