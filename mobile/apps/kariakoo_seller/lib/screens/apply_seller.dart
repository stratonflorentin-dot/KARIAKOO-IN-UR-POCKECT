import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kariakoo_core/kariakoo_core.dart';

const List<String> _areas = ['kariakoo', 'posta', 'sinza', 'mwenge'];

/// Apply to sell. Calls apply_as_seller, which grants the seller role and
/// creates a pending shop; an admin approves it before it goes public.
class SellerApplyScreen extends ConsumerStatefulWidget {
  const SellerApplyScreen({super.key});
  @override
  ConsumerState<SellerApplyScreen> createState() => _SellerApplyScreenState();
}

class _SellerApplyScreenState extends ConsumerState<SellerApplyScreen> {
  final _form = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _address = TextEditingController();
  String? _category;
  String _area = 'kariakoo';
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    _address.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_form.currentState!.validate() || _category == null) {
      setState(() => _error = _category == null ? 'Choose a category.' : null);
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(rolesRepositoryProvider).applyAsSeller(
            name: _name.text.trim(),
            category: _category!,
            area: _area,
            address: _address.text.trim(),
          );
      ref.invalidate(sessionProvider);
      ref.invalidate(myShopProvider);
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      if (mounted) {
        setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final categories = ref.watch(categoriesProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Open a shop')),
      body: Form(
        key: _form,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const Text(
                'List your products on KARIAKOO. An admin reviews new shops before they go live.',
                style: TextStyle(color: AppColors.muted)),
            const SizedBox(height: 16),
            TextFormField(
              controller: _name,
              decoration: const InputDecoration(labelText: 'Shop name'),
              validator: (v) => (v == null || v.trim().length < 2)
                  ? 'Enter a shop name'
                  : null,
            ),
            const SizedBox(height: 12),
            categories.when(
              loading: () => const LinearProgressIndicator(),
              error: (error, _) => Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                      'Shop categories could not be loaded. Check your connection and try again.'),
                  TextButton.icon(
                    onPressed: () => ref.invalidate(categoriesProvider),
                    icon: const Icon(Icons.refresh),
                    label: const Text('Retry'),
                  ),
                ],
              ),
              data: (cats) => cats.isEmpty
                  ? const Text(
                      'No shop categories are available yet. Please try again later.')
                  : DropdownButtonFormField<String>(
                      initialValue: _category,
                      decoration:
                          const InputDecoration(labelText: 'Main category'),
                      items: [
                        for (final c in cats)
                          DropdownMenuItem(value: c.slug, child: Text(c.name))
                      ],
                      onChanged: (v) => setState(() => _category = v),
                    ),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: _area,
              decoration: const InputDecoration(labelText: 'Area'),
              items: [
                for (final a in _areas)
                  DropdownMenuItem(
                      value: a,
                      child: Text(a[0].toUpperCase() + a.substring(1)))
              ],
              onChanged: (v) => setState(() => _area = v ?? 'kariakoo'),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _address,
              decoration: const InputDecoration(labelText: 'Shop address'),
              validator: (v) =>
                  (v == null || v.trim().isEmpty) ? 'Enter an address' : null,
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: const TextStyle(color: AppColors.danger)),
            ],
            const SizedBox(height: 20),
            ElevatedButton(
                onPressed: _busy ? null : _submit,
                child: Text(_busy ? 'Submitting…' : 'Apply to sell')),
          ],
        ),
      ),
    );
  }
}
