import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui';

const workflowCards = [
  {
    href: '/workflows/referrals',
    title: 'Referral Tracking',
    description: 'Track source attribution, rep ownership, and payout readiness.',
  },
  {
    href: '/workflows/penny-bundles',
    title: 'Penny Bundle Credits',
    description: 'Review submissions and track approval/credit application status.',
  },
  {
    href: '/workflows/overdue',
    title: 'Overdue Accounts',
    description: 'Monitor account aging snapshots and payment-risk buckets.',
  },
  {
    href: '/workflows/vendor-days',
    title: 'Vendor Day Scheduler',
    description: 'Plan vendor day events and keep account-level history complete.',
  },
  {
    href: '/workflows/sample-boxes',
    title: 'Sample Box Requests',
    description: 'Submit and track lead sample requests through fulfillment.',
  },
  {
    href: '/workflows/edit-suggestions',
    title: 'Brand Ambassador Suggestions',
    description: 'Submit restricted account/contact edit requests for approval.',
  },
];

export default function WorkflowsHomePage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Priority Workflows</h1>
        <p className="text-sm text-slate-500">Ops-first workflow center for referrals, credits, overdue accounts, vendor days, and sample box submissions.</p>
      </header>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {workflowCards.map((item) => (
          <Card key={item.href} className="border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="text-xl">{item.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">{item.description}</p>
              <Button asChild>
                <Link href={item.href}>Open workflow</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
