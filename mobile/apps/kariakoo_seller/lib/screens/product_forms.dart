import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kariakoo_core/kariakoo_core.dart';

/// Bottom sheet to add a new product (writes to `products`, RLS owner-scoped).
Future<void> showAddProductSheet(BuildContext context, {required Shop shop}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (ctx) => Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
      child: _AddProductForm(shop: shop),
    ),
  );
}

/// Bottom sheet to edit price / stock / availability of an existing product.
Future<void> showEditProductSheet(BuildContext context,
    {required Product product, required String shopId}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (ctx) => Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
      child: _EditProductForm(product: product, shopId: shopId),
    ),
  );
}

class _AddProductForm extends ConsumerStatefulWidget {
  const _AddProductForm({required this.shop});
  final Shop shop;
  @override
  ConsumerState<_AddProductForm> createState() => _AddProductFormState();
}

class _AddProductFormState extends ConsumerState<_AddProductForm> {
  final _form = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _price = TextEditingController();
  final _stock = TextEditingController(text: '1');
  final _description = TextEditingController();
  String? _category;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    _price.dispose();
    _stock.dispose();
    _description.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_form.currentState!.validate() || _category == null) {
      setState(() => _error = _category == null ? 'Choose a category.' : null);
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(sellerRepositoryProvider).addProduct(
            shopId: widget.shop.id,
            name: _name.text.trim(),
            category: _category!,
            priceTzs: int.parse(_price.text),
            stock: int.parse(_stock.text),
            description: _description.text.trim(),
          );
      ref.invalidate(myProductsProvider(widget.shop.id));
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      setState(() => _error =
          'Could not save. ${e.toString().replaceFirst('Exception: ', '')}');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final categories = ref.watch(categoriesProvider);
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      child: Form(
        key: _form,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Add a product',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            TextFormField(
              controller: _name,
              decoration: const InputDecoration(labelText: 'Product name'),
              validator: (v) => (v == null || v.trim().length < 3)
                  ? 'At least 3 characters'
                  : null,
            ),
            const SizedBox(height: 12),
            categories.when(
              loading: () => const LinearProgressIndicator(),
              error: (_, __) => TextButton.icon(
                onPressed: () => ref.invalidate(categoriesProvider),
                icon: const Icon(Icons.refresh),
                label: const Text('Could not load categories. Try again.'),
              ),
              data: (cats) => cats.isEmpty
                  ? const Text('No categories are available yet.')
                  : DropdownButtonFormField<String>(
                      initialValue: _category,
                      decoration: const InputDecoration(labelText: 'Category'),
                      items: [
                        for (final c in cats)
                          DropdownMenuItem(value: c.slug, child: Text(c.name))
                      ],
                      onChanged: (v) => setState(() => _category = v),
                    ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _price,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Price (TSh)'),
                    validator: (v) {
                      final n = int.tryParse(v ?? '');
                      if (n == null || n < 100 || n > 50000000) {
                        return '100 – 50,000,000';
                      }
                      return null;
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextFormField(
                    controller: _stock,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Stock'),
                    validator: (v) {
                      final n = int.tryParse(v ?? '');
                      if (n == null || n < 0 || n > 100000) {
                        return '0 – 100,000';
                      }
                      return null;
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _description,
              maxLines: 3,
              decoration:
                  const InputDecoration(labelText: 'Description (optional)'),
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: const TextStyle(color: AppColors.danger)),
            ],
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _busy ? null : _save,
              child: Text(_busy ? 'Saving…' : 'Publish product'),
            ),
          ],
        ),
      ),
    );
  }
}

class _EditProductForm extends ConsumerStatefulWidget {
  const _EditProductForm({required this.product, required this.shopId});
  final Product product;
  final String shopId;
  @override
  ConsumerState<_EditProductForm> createState() => _EditProductFormState();
}

class _EditProductFormState extends ConsumerState<_EditProductForm> {
  late final _price =
      TextEditingController(text: widget.product.priceTzs.toString());
  late final _stock =
      TextEditingController(text: widget.product.stock.toString());
  bool _busy = false;

  @override
  void dispose() {
    _price.dispose();
    _stock.dispose();
    super.dispose();
  }

  Future<void> _run(Future<void> Function() action) async {
    setState(() => _busy = true);
    try {
      await action();
      ref.invalidate(myProductsProvider(widget.shopId));
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Could not save: $e')));
        setState(() => _busy = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final repo = ref.read(sellerRepositoryProvider);
    final archived = widget.product.status == 'archived';
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(widget.product.name,
              style:
                  const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _price,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Price (TSh)'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: TextField(
                  controller: _stock,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Stock'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: _busy
                ? null
                : () => _run(() => repo.updateProduct(
                      widget.product.id,
                      priceTzs: int.tryParse(_price.text),
                      stock: int.tryParse(_stock.text),
                    )),
            child: Text(_busy ? 'Saving…' : 'Save changes'),
          ),
          const SizedBox(height: 8),
          OutlinedButton(
            onPressed: _busy
                ? null
                : () => _run(() => repo.updateProduct(widget.product.id,
                    status: archived ? 'active' : 'archived')),
            child: Text(archived
                ? 'Restore to store'
                : 'Archive (hide from customers)'),
          ),
        ],
      ),
    );
  }
}
