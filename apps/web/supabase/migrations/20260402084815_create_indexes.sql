create index idx_properties_landlord on properties(landlord_id);
create index idx_tenants_property on tenants(property_id);
create index idx_tenants_clerk_user on tenants(clerk_user_id);
create index idx_requests_property on maintenance_requests(property_id);
create index idx_requests_status on maintenance_requests(status);
create index idx_requests_urgency on maintenance_requests(ai_urgency);
create index idx_request_photos_request on request_photos(request_id);
create index idx_vendors_landlord on vendors(landlord_id);
