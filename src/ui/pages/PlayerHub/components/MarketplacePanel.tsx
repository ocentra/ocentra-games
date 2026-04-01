interface MarketplaceListing {
  id: string;
  title: string;
}

interface MarketplacePanelProps {
  listings: MarketplaceListing[];
}

export function MarketplacePanel({ listings }: MarketplacePanelProps) {
  return (
    <section className="ph-panel">
      <h2 className="ph-panel-title">Marketplace</h2>
      <p className="ph-panel-subtitle">Current listings available in the market.</p>

      <ul className="ph-list">
        {listings.map((listing) => (
          <li key={listing.id} className="ph-list-item ph-list-item-block">
            <span className="ph-id">{listing.id}</span>
            <span className="ph-value">{listing.title}</span>
          </li>
        ))}
        {listings.length === 0 && <li className="ph-empty">No marketplace listings</li>}
      </ul>
    </section>
  );
}
