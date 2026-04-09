-- Split properties.address into structured columns
alter table properties add column address_line1 text;
alter table properties add column city text;
alter table properties add column state text;
alter table properties add column postal_code text;

-- Backfill existing rows from single-line address
-- Format assumption: "Street, City, STATE POSTAL"
update properties
set
  address_line1 = coalesce(nullif(split_part(address, ', ', 1), ''), address),
  city = coalesce(nullif(split_part(address, ', ', 2), ''), ''),
  state = coalesce(nullif(split_part(split_part(address, ', ', 3), ' ', 1), ''), ''),
  postal_code = coalesce(nullif(split_part(split_part(address, ', ', 3), ' ', 2), ''), '')
where address_line1 is null;

-- Set NOT NULL + defaults for new rows
alter table properties alter column address_line1 set not null;
alter table properties alter column city set not null;
alter table properties alter column state set not null;
alter table properties alter column postal_code set not null;
alter table properties alter column city set default '';
alter table properties alter column state set default '';
alter table properties alter column postal_code set default '';

-- Drop legacy address column
alter table properties drop column address;

-- Split tenants.name into first_name + last_name
alter table tenants add column first_name text;
alter table tenants add column last_name text;

update tenants
set
  first_name = split_part(name, ' ', 1),
  last_name = case
    when position(' ' in name) > 0 then substring(name from position(' ' in name) + 1)
    else ''
  end
where first_name is null;

alter table tenants alter column first_name set not null;
alter table tenants alter column last_name set not null;
alter table tenants alter column last_name set default '';

-- Drop legacy name column
alter table tenants drop column name;
