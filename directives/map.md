# Directive: Map

## Goal
Provide a live, dark-styled map centered strictly on the player's live position to help them orient themselves around campus without disclosing secret checkpoint locations, coordinates, pins, or distance statistics (preserving the treasure hunt discovery element).

## Outputs
- Map fills the viewport using default crisp standard **OpenStreetMap** tiles (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`) with no inversion filter, requiring no API key.
- Shows the user's live position with a vibrant blue pulsing dot (+ GPS accuracy circle).
- Floating Recenter and Zoom (+ / −) controls.
- Top status pill displaying user live coordinates and GPS fix indicator.
- **Treasure Hunt Secrecy**: Target locations, target pins, geofence radius circles, and distance/direction bottom sheet cards are omitted so players must solve clues rather than navigate by GPS coordinates.
