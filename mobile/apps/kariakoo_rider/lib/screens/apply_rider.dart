import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kariakoo_core/kariakoo_core.dart';

const List<String> _zones = ['kariakoo', 'ilala', 'kinondoni', 'ubungo', 'temeke', 'kigamboni'];

/// Apply to become a rider. Calls apply_as_rider, which grants the rider role
/// (pending) and creates the rider record; an admin approves before jobs flow.
class RiderApplyScreen extends ConsumerStatefulWidget {
  const RiderApplyScreen({super.key});
  @override
  ConsumerState<RiderApplyScreen> createState() => _RiderApplyScreenState();
}

class _RiderApplyScreenState extends ConsumerState<RiderApplyScreen> {
  final _form = GlobalKey<FormState>();
  final _vehicle = TextEditingController(text: 'Motorcycle');
  final _plate = TextEditingController();
  String _zone = 'kariakoo';
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _vehicle.dispose();
    _plate.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(rolesRepositoryProvider).applyAsRider(
            vehicle: _vehicle.text.trim(),
            plate: _plate.text.trim(),
            baseZone: _zone,
          );
      ref.invalidate(sessionProvider); // reload roles -> show the dashboard
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Become a rider')),
      body: Form(
        key: _form,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const Text('Tell us about your vehicle. An admin reviews new riders before you start getting jobs.',
                style: TextStyle(color: AppColors.muted)),
            const SizedBox(height: 16),
            TextFormField(
              controller: _vehicle,
              decoration: const InputDecoration(labelText: 'Vehicle (e.g. Motorcycle)'),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _plate,
              decoration: const InputDecoration(labelText: 'Number plate'),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: _zone,
              decoration: const InputDecoration(labelText: 'Base area'),
              items: [for (final z in _zones) DropdownMenuItem(value: z, child: Text(z[0].toUpperCase() + z.substring(1)))],
              onChanged: (v) => setState(() => _zone = v ?? 'kariakoo'),
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: const TextStyle(color: AppColors.danger)),
            ],
            const SizedBox(height: 20),
            ElevatedButton(onPressed: _busy ? null : _submit, child: Text(_busy ? 'Submitting…' : 'Apply to ride')),
          ],
        ),
      ),
    );
  }
}
