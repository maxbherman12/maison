'use client';

import { useState } from 'react';
import {
  ArrowLeft,
  Pencil,
  Timer,
  Package,
  CreditCard,
  FileText,
  Truck,
  Plus,
} from 'lucide-react';
import type { Project } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { formatMoney, computeOutstanding } from '@/lib/types';

interface ProjectSummaryProps {
  project: Project;
  onLog: () => void;
  onStatus: () => void;
  onInvoice: () => void;
}

export function ProjectSummary({
  project,
  onLog,
  onStatus,
  onInvoice,
}: ProjectSummaryProps) {
  const [editing, setEditing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const labor = project.hours.reduce((sum, entry) => sum + entry.amount, 0);
  const purchases = project.furniture.reduce(
    (sum, item) => sum + item.trade,
    0
  );

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-start justify-between gap-3 mb-6">
        <div className="min-w-0">
          <button
            onClick={() => {}}
            className="text-sm text-[#bd765b] hover:underline"
            aria-label="Go back to all projects"
          >
            <ArrowLeft className="inline size-3.5 mr-1" /> All projects
          </button>
          <span className="text-[10px] uppercase tracking-[0.16em] text-[#99998e] block mt-1">
            {project.client}
          </span>
          <h1 className="mt-1 truncate font-serif text-3xl leading-tight sm:text-4xl">
            {project.project}
          </h1>
        </div>
        <button
          onClick={() => setEditing(true)}
          className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[#deddd5] bg-[#fbfaf7] text-[#bd765b] hover:bg-[#f1e6df] transition-colors"
          aria-label="Edit project details"
          title="Edit project details"
        >
          <Pencil className="size-5" />
        </button>
      </div>

      {editing ? (
        <ProjectEditForm
          project={project}
          onSave={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <>
          <div className="mb-8 grid gap-4 sm:grid-cols-3">
            <StatCard label="Hours logged" value={project.hours.length} />
            <StatCard
              label="Furniture items"
              value={project.furniture.length}
            />
            <StatCard label="Outstanding" value={formatMoney(project.outstanding)} />
          </div>

          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex -space-x-2">
              {project.furniture.slice(0, 5).map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedItem(item.id)}
                  className="relative flex size-10 shrink-0 items-center justify-center rounded-full border border-[#deddd5] bg-[#fffefa] hover:ring-2 ring-[#bd765b] transition-colors"
                  aria-label={`View ${item.name}`}
                >
                  <Package className="size-4 text-[#85857a]" />
                  {item.status === 'Pending' && (
                    <span className="absolute right-0 bottom-0 flex size-3.5 shrink-0 items-center justify-center rounded-full bg-[#bd765b] text-white text-[10px]">
                      !
                    </span>
                  )}
                </button>
              ))}
              {project.furniture.length > 5 && (
                <button className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[#deddd5] bg-[#fffefa] text-sm text-[#85857a]">
                  +{project.furniture.length - 5}
                </button>
              )}
            </div>
            <div className="ml-auto flex gap-2">
              <ActionButton
                icon={<Timer className="size-5" />}
                title="Log hours"
                onClick={onLog}
              />
              <ActionButton
                icon={<Package className="size-5" />}
                title="Log furniture"
                onClick={() => {
                  // handled by log view
                }}
              />
              <ActionButton
                icon={<CreditCard className="size-5" />}
                title="Custom charge"
                onClick={() => {}}
              />
              <ActionButton
                icon={<FileText className="size-5" />}
                title="View invoice"
                onClick={onInvoice}
              />
            </div>
          </div>

          <div className="mb-6">
            <h2 className="mb-3 font-serif text-2xl">Financial summary</h2>
            <div className="rounded-xl border border-[#deddd5] bg-[#fbfaf7] p-5 sm:p-8">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.1em] text-[#85857a]">Labor</p>
                  <p className="mt-1 font-serif text-xl">{formatMoney(labor)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.1em] text-[#85857a]">Furniture purchases</p>
                  <p className="mt-1 font-serif text-xl">{formatMoney(purchases)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.1em] text-[#85857a]">Total outstanding</p>
                  <p className="mt-1 font-serif text-2xl text-[#292923]">{formatMoney(computeOutstanding(project.hours, project.furniture))}</p>
                </div>
              </div>
            </div>
          </div>

          {selectedItem && (
            <div className="fixed inset-0 z-10 flex items-end justify-center bg-[#292923]/25 p-4 sm:items-center">
              <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-[#fffefa] p-6">
                {selectedItem && (
                  <FurnitureItemDetail
                    item={project.furniture.find((i) => i.id === selectedItem)!}
                    onClose={() => setSelectedItem(null)}
                  />
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-[#ece9e0] px-4 py-4">
      <span className="block text-[11px] uppercase tracking-[0.1em] text-[#99998e]">
        {label}
      </span>
      <strong className="mt-2 block font-serif text-2xl font-normal">{value}</strong>
    </div>
  );
}

function ActionButton({
  icon,
  title,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[#deddd5] bg-[#fbfaf7] text-sm text-[#bd765b] transition-colors hover:border-[#bd765b] hover:bg-[#f1e6df]"
    >
      <span className="flex size-8 items-center justify-center">{icon}</span>
      <span className="text-xs font-medium">{title}</span>
    </button>
  );
}

function ProjectEditForm({
  project,
  onSave,
  onCancel,
}: {
  project: Project;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [client, setClient] = useState(project.client);
  const [name, setName] = useState(project.project);
  const [address, setAddress] = useState(project.address);
  const [rate, setRate] = useState(String(project.hourlyRate));

  return (
    <div className="mt-7 rounded-2xl border border-[#deddd5] bg-[#fbfaf7] p-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Client name" value={client} onChange={setClient} />
        <Field label="Project name" value={name} onChange={setName} />
        <Field label="Address" value={address} onChange={setAddress} />
        <Field label="Hourly rate" value={rate} prefix="$" onChange={setRate} />
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button
          onClick={() => {
            onSave();
          }}
          className="w-full rounded-xl bg-[#bd765b] text-white sm:w-auto"
        >
          Save details
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  prefix,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  prefix?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs uppercase tracking-[0.1em] text-[#85857a]">
        {label}
      </span>
      <span className="flex items-center rounded-xl border border-[#deddd5] bg-[#fffefa] focus-within:border-[#bd765b]">
        {prefix && <span className="text-sm text-[#99998e] px-3">{prefix}</span>}
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-full bg-transparent px-1 text-sm outline-none"
        />
      </span>
    </label>
  );
}

function FurnitureItemDetail({
  item,
  onClose,
}: {
  item: Project['furniture'][number];
  onClose: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-3xl">Furniture details</h2>
        <button onClick={onClose} aria-label="Close">
          <Truck className="size-5" />
        </button>
      </div>
      <div className="grid gap-4">
        <Field label="Item name" value={item.name} onChange={() => {}} />
        <Field label="Vendor" value={item.vendor} onChange={() => {}} />
        <Field label="Link" value={item.link} onChange={() => {}} />
        <Field label="Tags" value={item.tags.join(', ')} onChange={() => {}} />
        <Field label="Notes" value={item.notes} onChange={() => {}} />
        <label className="block">
          <span className="mb-2 block text-xs uppercase tracking-[0.1em] text-[#85857a]">
            Status
          </span>
          <select
            value={item.status}
            className="h-11 w-full rounded-xl border border-[#deddd5] bg-[#fffefa] px-3 text-sm"
            onChange={() => {}}
          >
            <option>Pending</option>
            <option>Ordered</option>
            <option>In transit</option>
            <option>Delivered</option>
          </select>
        </label>
        <div className="flex flex-col gap-3 mt-4">
          <Button className="rounded-xl bg-[#bd765b] text-white">Save changes</Button>
          <Button variant="outline" className="rounded-xl border-[#c98973] text-[#a9573d]">
            Delete furniture entry
          </Button>
        </div>
      </div>
    </div>
  );
}
