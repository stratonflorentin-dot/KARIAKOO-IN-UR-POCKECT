import 'package:flutter/material.dart';

/// KARIAKOO brand palette — emerald green + gold, matching the web app's
/// design tokens (src/app/globals.css).
class AppColors {
  const AppColors._();

  // Brand emerald.
  static const brand50 = Color(0xFFECFDF5);
  static const brand100 = Color(0xFFD1FAE5);
  static const brand200 = Color(0xFFA7F3D0);
  static const brand300 = Color(0xFF6EE7B7);
  static const brand400 = Color(0xFF34D399);
  static const brand500 = Color(0xFF10B981);
  static const brand600 = Color(0xFF059669); // fills behind white text
  static const brand700 = Color(0xFF047857); // text/links on white
  static const brand800 = Color(0xFF065F46);
  static const brand900 = Color(0xFF064E3B);

  // Gold accent (top CTAs, logo mark) — carries ink text.
  static const gold300 = Color(0xFFFCD34D);
  static const gold400 = Color(0xFFF5BE1E);
  static const gold500 = Color(0xFFE0A80E);
  static const gold600 = Color(0xFFB7870B);

  // Neutrals / surfaces.
  static const ink = Color(0xFF0C0A09); // near-black text
  static const muted = Color(0xFF57534E); // secondary text
  static const line = Color(0xFFE7E5E4); // borders
  static const surface = Color(0xFFFFFFFF);
  static const subtle = Color(0xFFFAFAF9);
  static const night = Color(0xFF0A211A); // deep green-black heroes/nav

  // Semantic.
  static const success = brand600;
  static const warning = Color(0xFFD97706);
  static const danger = Color(0xFFB91C1C);
}
