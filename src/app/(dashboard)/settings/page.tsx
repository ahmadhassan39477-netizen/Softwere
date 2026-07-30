import { requireUser } from "@/lib/session";

export default async function SettingsPage() {
  const user = await requireUser();
  return (
    <>
      <p className="text-sm text-slate-500">Workspace</p><h1 className="mt-1 text-3xl font-bold">Settings</h1>
      <div className="card mt-7 max-w-2xl p-6">
        <h2 className="font-semibold">Account details</h2>
        <dl className="mt-5 divide-y divide-slate-100 text-sm">
          <div className="flex justify-between py-3"><dt className="text-slate-500">Name</dt><dd className="font-medium">{user.name}</dd></div>
          <div className="flex justify-between py-3"><dt className="text-slate-500">Email</dt><dd className="font-medium">{user.email}</dd></div>
          <div className="flex justify-between py-3"><dt className="text-slate-500">Plan</dt><dd className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">{user.plan}</dd></div>
        </dl>
      </div>
      <div className="card mt-5 max-w-2xl p-6"><h2 className="font-semibold">Platform roadmap</h2><p className="mt-2 text-sm leading-6 text-slate-500">The connector layer is platform-aware and ready for future eBay and Etsy integrations. Facebook currently uses official Login, Pages, Messaging, Webhooks, and Catalog Graph APIs only.</p></div>
    </>
  );
}
