import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kariakoo_core/kariakoo_core.dart';

class RiderEarningsScreen extends ConsumerStatefulWidget {
  const RiderEarningsScreen({super.key, required this.riderId});
  final String riderId;

  @override
  ConsumerState<RiderEarningsScreen> createState() =>
      _RiderEarningsScreenState();
}

class _RiderEarningsScreenState extends ConsumerState<RiderEarningsScreen> {
  int _tab = 0;

  @override
  Widget build(BuildContext context) {
    final history = ref.watch(riderJobHistoryProvider(widget.riderId));
    return Scaffold(
      appBar: AppBar(title: const Text('Earnings & history')),
      body: history.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, __) => RetryPanel(
          message: 'Could not load your delivery history.',
          onRetry: () =>
              ref.invalidate(riderJobHistoryProvider(widget.riderId)),
        ),
        data: (jobs) {
          final completed = jobs.where((job) => job.paid).toList();
          final earned =
              completed.fold<int>(0, (sum, job) => sum + job.payoutTzs);
          final inProgress = jobs
              .where((job) => const {'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'}
                  .contains(job.status))
              .fold<int>(0, (sum, job) => sum + job.payoutTzs);
          final visible = _tab == 0 ? completed : jobs;
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(riderJobHistoryProvider(widget.riderId));
              await ref.read(riderJobHistoryProvider(widget.riderId).future);
            },
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Row(children: [
                  Expanded(
                    child: _EarningCard(
                      label: 'Earned from deliveries',
                      amount: earned,
                      icon: Icons.payments_outlined,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _EarningCard(
                      label: 'Active job value',
                      amount: inProgress,
                      icon: Icons.delivery_dining,
                    ),
                  ),
                ]),
                const SizedBox(height: 18),
                SegmentedButton<int>(
                  segments: const [
                    ButtonSegment(value: 0, label: Text('Earnings')),
                    ButtonSegment(value: 1, label: Text('History')),
                  ],
                  selected: {_tab},
                  onSelectionChanged: (selection) =>
                      setState(() => _tab = selection.first),
                ),
                const SizedBox(height: 14),
                if (visible.isEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 40),
                    child: Center(
                      child: Text(_tab == 0
                          ? 'Completed deliveries will appear here.'
                          : 'Your delivery history is empty.'),
                    ),
                  )
                else
                  for (final job in visible) _JobTile(job: job),
                const SizedBox(height: 8),
                const Text(
                  'Earnings count only deliveries marked delivered. Active payouts are estimates until completion.',
                  style: TextStyle(color: AppColors.muted, fontSize: 12),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _EarningCard extends StatelessWidget {
  const _EarningCard(
      {required this.label, required this.amount, required this.icon});
  final String label;
  final int amount;
  final IconData icon;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.line),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Icon(icon, color: AppColors.brand700),
          const SizedBox(height: 8),
          Text(label,
              style: const TextStyle(color: AppColors.muted, fontSize: 12)),
          const SizedBox(height: 3),
          Text(formatTzs(amount),
              style:
                  const TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
        ]),
      );
}

class _JobTile extends StatelessWidget {
  const _JobTile({required this.job});
  final RiderJobRecord job;

  @override
  Widget build(BuildContext context) {
    final color = job.paid ? AppColors.brand700 : AppColors.warning;
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.line),
      ),
      child: Row(children: [
        CircleAvatar(
          backgroundColor: color.withValues(alpha: .12),
          child: Icon(job.paid ? Icons.check : Icons.delivery_dining,
              color: color),
        ),
        const SizedBox(width: 12),
        Expanded(
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(job.reference,
                style: const TextStyle(fontWeight: FontWeight.w700)),
            Text(
              '${job.status.replaceAll('_', ' ')} · ${job.updatedAt.day}/${job.updatedAt.month}/${job.updatedAt.year}',
              style: const TextStyle(color: AppColors.muted, fontSize: 12),
            ),
          ]),
        ),
        Text(formatTzs(job.payoutTzs),
            style: const TextStyle(fontWeight: FontWeight.w800)),
      ]),
    );
  }
}
