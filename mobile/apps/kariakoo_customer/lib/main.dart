import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kariakoo_core/kariakoo_core.dart';

import 'screens/customer_shell.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initSupabase();
  runApp(const ProviderScope(child: CustomerApp()));
}

class CustomerApp extends StatelessWidget {
  const CustomerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'KARIAKOO',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      home: AuthGate(
        appName: 'Customer',
        home: (context, session) => CustomerShell(session: session),
      ),
    );
  }
}
