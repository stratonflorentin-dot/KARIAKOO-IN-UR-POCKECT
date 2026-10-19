import 'package:intl/intl.dart';

final NumberFormat _grouped = NumberFormat.decimalPattern('en');

/// Tanzanian shillings, e.g. 12345 -> "TSh 12,345".
String formatTzs(int amount) => 'TSh ${_grouped.format(amount)}';
