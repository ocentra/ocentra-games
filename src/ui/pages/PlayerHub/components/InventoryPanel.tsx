interface InventoryItem {
  itemId: string;
  quantity: number;
}

interface InventoryPanelProps {
  items: InventoryItem[];
}

export function InventoryPanel({ items }: InventoryPanelProps) {
  return (
    <section className="ph-panel">
      <h2 className="ph-panel-title">Inventory</h2>
      <p className="ph-panel-subtitle">Owned items and quantities.</p>

      <ul className="ph-list">
        {items.map((item) => (
          <li key={item.itemId} className="ph-list-item">
            <span className="ph-id">{item.itemId}</span>
            <span className="ph-value">x{item.quantity}</span>
          </li>
        ))}
        {items.length === 0 && <li className="ph-empty">No inventory items</li>}
      </ul>
    </section>
  );
}
