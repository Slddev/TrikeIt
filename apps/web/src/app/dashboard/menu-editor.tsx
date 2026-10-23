"use client";

import Image from "next/image";
import { useActionState, useState, useTransition } from "react";
import { removeMenuItem, saveMenuItem, type FormState } from "./merchant-actions";
import { field, primary } from "./store-form";

type Item = {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  featured: boolean;
  available: boolean;
};

export function MenuEditor({ items }: { items: Item[] }) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 && !adding && (
        <p className="rounded-2xl bg-white p-6 text-sm text-brand-navy/60">Your menu is empty.</p>
      )}
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <ItemRow key={`${item.id}-${item.name}-${item.price}-${item.featured}-${item.available}`} item={item} />
        ))}
      </ul>
      {adding ? (
        <ItemForm onDone={() => setAdding(false)} />
      ) : (
        <button onClick={() => setAdding(true)} className={`${primary} self-start`}>
          Add item
        </button>
      )}
    </div>
  );
}

function ItemRow({ item }: { item: Item }) {
  const [editing, setEditing] = useState(false);
  const [removing, startRemove] = useTransition();

  if (editing) return <ItemForm item={item} onDone={() => setEditing(false)} />;

  return (
    <li className="flex items-center gap-4 rounded-2xl bg-white p-3 sm:p-4">
      <Thumb url={item.imageUrl} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 font-semibold">
          {item.name}
          {item.featured && <span className="rounded-full bg-brand-gold px-2 py-0.5 text-xs">Featured</span>}
          {!item.available && <span className="rounded-full bg-brand-navy/10 px-2 py-0.5 text-xs">Sold out</span>}
        </p>
        {item.description && <p className="truncate text-sm text-brand-navy/60">{item.description}</p>}
        <p className="text-sm font-semibold">₱{item.price}</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button onClick={() => setEditing(true)} className="h-9 rounded-lg border-2 border-brand-navy px-3 text-sm font-semibold">
          Edit
        </button>
        <button
          disabled={removing}
          onClick={() => confirm(`Remove ${item.name} from the menu?`) && startRemove(() => removeMenuItem(item.id))}
          className="h-9 rounded-lg px-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-40"
        >
          Remove
        </button>
      </div>
    </li>
  );
}

function ItemForm({ item, onDone }: { item?: Item; onDone: () => void }) {
  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, formData) => {
    const result = await saveMenuItem(prev, formData);
    if (result.saved) onDone();
    return result;
  }, {});

  return (
    <form action={action} className="flex flex-col gap-4 rounded-2xl border-2 border-brand-navy/10 bg-white p-4 sm:p-6">
      <input type="hidden" name="id" value={item?.id ?? ""} />
      <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
        <label className="flex flex-col gap-1 text-xs font-medium">
          Name
          <input name="name" required defaultValue={item?.name} className={field} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium">
          Price (₱)
          <input name="price" type="number" min={1} step={1} required defaultValue={item?.price} className={field} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium sm:col-span-2">
          Description
          <input name="description" defaultValue={item?.description} className={field} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium sm:col-span-2">
          Photo link
          <input name="imageUrl" type="url" defaultValue={item?.imageUrl} placeholder="https://…" className={field} />
        </label>
      </div>
      <div className="flex flex-wrap gap-5 text-sm font-medium">
        <label className="flex items-center gap-2">
          <input name="featured" type="checkbox" defaultChecked={item?.featured} className="h-5 w-5 accent-brand-navy" />
          Featured
        </label>
        <label className="flex items-center gap-2">
          <input name="available" type="checkbox" defaultChecked={item?.available ?? true} className="h-5 w-5 accent-brand-navy" />
          Available
        </label>
      </div>
      <div className="flex gap-2">
        <button disabled={pending} className={primary}>
          {pending ? "Saving…" : item ? "Save item" : "Add to menu"}
        </button>
        <button type="button" onClick={onDone} className="h-11 rounded-xl px-4 text-sm font-semibold">
          Cancel
        </button>
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
    </form>
  );
}

function Thumb({ url }: { url: string }) {
  if (!url) return <div className="h-16 w-16 shrink-0 rounded-xl bg-brand-cream" />;
  // Merchants link photos from anywhere, so they're shown as-is rather than through the optimizer.
  return <Image src={url} alt="" width={64} height={64} unoptimized className="h-16 w-16 shrink-0 rounded-xl object-cover" />;
}
