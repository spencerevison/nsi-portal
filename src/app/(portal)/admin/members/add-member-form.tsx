"use client";

import { useState, useTransition } from "react";
import { inviteMember } from "./actions";
import type { RoleOption } from "@/lib/members";

export function AddMemberForm({ roles }: { roles: RoleOption[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);

    startTransition(async () => {
      const result = await inviteMember({
        email: String(fd.get("email") ?? ""),
        first_name: String(fd.get("first_name") ?? ""),
        last_name: String(fd.get("last_name") ?? ""),
        lot_number: String(fd.get("lot_number") ?? ""),
        role_id: String(fd.get("role_id") ?? ""),
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }
      form.reset();
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded bg-neutral-900 px-3 py-1.5 text-sm text-white hover:bg-neutral-800"
      >
        Add member
      </button>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3 rounded-md border border-neutral-200 bg-white p-4"
    >
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">
          <span className="mb-1 block text-neutral-700">First name</span>
          <input
            name="first_name"
            required
            className="w-full rounded border border-neutral-300 px-2 py-1 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-neutral-700">Last name</span>
          <input
            name="last_name"
            required
            className="w-full rounded border border-neutral-300 px-2 py-1 text-sm"
          />
        </label>
      </div>
      <label className="block text-sm">
        <span className="mb-1 block text-neutral-700">Email</span>
        <input
          name="email"
          type="email"
          required
          className="w-full rounded border border-neutral-300 px-2 py-1 text-sm"
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">
          <span className="mb-1 block text-neutral-700">Lot number</span>
          <input
            name="lot_number"
            className="w-full rounded border border-neutral-300 px-2 py-1 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-neutral-700">Role</span>
          <select
            name="role_id"
            required
            defaultValue=""
            className="w-full rounded border border-neutral-300 px-2 py-1 text-sm"
          >
            <option value="" disabled>
              Select a role
            </option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-neutral-900 px-3 py-1.5 text-sm text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {pending ? "Sending..." : "Send invitation"}
        </button>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setOpen(false);
          }}
          className="rounded border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
