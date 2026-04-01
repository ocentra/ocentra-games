# @ocentra/asset-domain Architecture

`@ocentra/asset-domain` defines asset model contracts and serialization used by the app and tooling.

## Owns

- Resource entry hierarchy
- Serialization decorators and serializer
- Asset identifiers and asset-type constants
- Asset metadata contracts

## Design

```mermaid
flowchart TD
  assetDomain[asset-domain]
  mainApp[main app assets and inspector]
  assetEditor[asset editor]
  syncLayer[asset sync and storage adapters]

  mainApp --> assetDomain
  assetEditor --> assetDomain
  syncLayer --> assetDomain
```

## Boundaries

- Storage location and API routes are out of scope; those belong to boundary-domain and endpoint-domain.
- Domain remains runtime-agnostic and focused on data model + serialization behavior.
