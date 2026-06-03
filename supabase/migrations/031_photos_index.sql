create index if not exists photos_collection_key_created_at
  on photos (collection_key, created_at desc);
