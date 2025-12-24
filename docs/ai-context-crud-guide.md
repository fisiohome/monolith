# AI Context: CRUD Operations Guide

This document provides AI assistants with patterns and guidelines for implementing CRUD (Create, Read, Update, Delete) operations in the Fisiohome Admin Portal, integrating with external APIs.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Frontend (React/Inertia)                       │
│  app/frontend/pages/AdminPortal/{Feature}/Index.tsx                     │
│  app/frontend/types/admin-portal/{feature}.ts                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        Rails Controller                                  │
│  app/controllers/admin_portal/{feature}_controller.rb                   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           Service Layer                                  │
│  app/services/admin_portal/{feature}_service.rb                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                        ┌───────────┴───────────┐
                        ▼                       ▼
┌───────────────────────────────────┐ ┌─────────────────────────────────────┐
│          Model (ActiveModel)      │ │        External API Client          │
│  app/models/{feature}.rb          │ │  app/services/fisiohome_api/client  │
│  (type safety & validation)       │ └─────────────────────────────────────┘
└───────────────────────────────────┘                   │
                                                        ▼
                                    ┌─────────────────────────────────────────┐
                                    │          External API Service           │
                                    │  (e.g., api/v1/feature-flags)           │
                                    └─────────────────────────────────────────┘
```

## Step-by-Step Implementation Guide

### Step 1: Create the Model

**Location**: `app/models/{feature}.rb`

**Purpose**: Defines the data structure with type-safe attributes. Uses ActiveModel for validation and attribute casting without requiring a database table.

**Template**:

```ruby
class {Feature}
  include ActiveModel::Model
  include ActiveModel::Attributes

  attribute :id, :string
  attribute :name, :string
  attribute :is_active, :boolean
  attribute :created_at, :datetime
  attribute :updated_at, :datetime
  # Add other attributes as needed
end
```

**Benefits**:
- **Type safety**: Attributes are automatically cast to their defined types
- **Encapsulation**: Data structure defined in one place
- **Validation ready**: Can add ActiveModel validations if needed
- **Clean serialization**: `model.attributes` returns a clean hash

**Reference Implementation**: `app/models/voucher.rb`, `app/models/feature_flag.rb`

---

### Step 2: Create the Service Layer

**Location**: `app/services/admin_portal/{feature}_service.rb`

**Purpose**: Handles all communication with the external API, data transformation, and error handling.

**Template**:

```ruby
module AdminPortal
  class {Feature}Service
    def initialize(client: FisiohomeApi::Client, key_format: :snake)
      @client = client
      @key_format = key_format
    end

    # LIST - Fetch all records
    def list(filters = {})
      query = build_query_params(filters)
      response = client.get("/api/v1/{endpoint}", params: query)

      if response.success?
        build_list_response(response.body)
      else
        Rails.logger.error("[{Feature}Service] Failed to fetch: #{response.status}")
        {items: [], meta: {}}
      end
    rescue Faraday::Error => e
      handle_network_error("list", e)
    end

    # FIND - Fetch single record
    def find(id)
      response = client.get("/api/v1/{endpoint}/#{id}")

      if response.success?
        build_single_response(response.body)
      else
        {item: nil}
      end
    rescue Faraday::Error => e
      handle_network_error("find", e)
    end

    # CREATE - Create new record
    def create(attributes)
      payload = normalize_payload(attributes)
      response = client.post("/api/v1/{endpoint}", body: payload)
      handle_mutation_response(response, action: "create")
    rescue Faraday::Error => e
      handle_mutation_exception("create", e)
    end

    # UPDATE - Update existing record
    def update(id, attributes)
      payload = normalize_payload(attributes)
      response = client.put("/api/v1/{endpoint}/#{id}", body: payload)
      handle_mutation_response(response, action: "update")
    rescue Faraday::Error => e
      handle_mutation_exception("update", e)
    end

    # DELETE - Remove record
    def destroy(id)
      response = client.delete("/api/v1/{endpoint}/#{id}")

      if response.success?
        {success: true}
      else
        errors = normalize_errors(response.body, fallback: "Failed to delete.")
        {success: false, errors: format_errors(errors)}
      end
    rescue Faraday::Error => e
      handle_mutation_exception("delete", e)
    end

    private

    attr_reader :client, :key_format

    # Transform keys to camelCase or snake_case based on key_format
    def deep_transform_keys_format(value, format:)
      return value unless value.respond_to?(:deep_transform_keys)

      transformer = case format&.to_sym
        when :camel then ->(key) { key.to_s.camelize(:lower) }
        when :snake then ->(key) { key.to_s.underscore }
      end

      return value unless transformer
      value.deep_transform_keys(&transformer)
    end

    def extract_data(body)
      body.is_a?(Hash) ? (body["data"] || body[:data] || body) : []
    end

    # Builds a single item from API data using the model for type safety
    def build_item(item)
      return unless item

      # Extract attributes if the item has an attributes property
      # Handles both string and symbol keys, falling back to the item itself
      attributes = item.is_a?(Hash) ? (item["attributes"] || item[:attributes] || item) : item

      # Create model instance for validation and type safety
      model = {Feature}.new(attributes)

      # Return the clean attributes hash instead of the model object
      # This gives us validation but clean serialization
      model.attributes
    end

    def handle_mutation_response(response, action:)
      if response.success?
        {success: true, item: build_item(extract_data(response.body))}
      else
        errors = normalize_errors(response.body, fallback: "Failed to #{action}.")
        {success: false, errors: format_errors(errors)}
      end
    end

    def handle_mutation_exception(action, error)
      Rails.logger.error("[{Feature}Service] #{action} error: #{error.message}")
      {success: false, errors: {full_messages: ["Unable to #{action}. Please try again."]}}
    end
  end
end
```

**Reference Implementation**: `app/services/admin_portal/vouchers_service.rb`, `app/services/admin_portal/feature_flags_service.rb`

---

### Step 3: Create the Controller

**Location**: `app/controllers/admin_portal/{feature}_controller.rb`

**Purpose**: Handles HTTP requests, uses the service layer, and renders Inertia responses.

**Template**:

```ruby
module AdminPortal
  class {Feature}Controller < ApplicationController
    before_action :ensure_admin!  # or other authorization

    def index
      render inertia: "AdminPortal/{Feature}/Index", props: deep_transform_keys_to_camel_case({
        items: InertiaRails.defer { service.list[:items] },
        # Add other props as needed
      })
    end

    def create
      result = service.create(item_params)

      if result[:success]
        redirect_to admin_portal_{feature}_path, notice: "Created successfully."
      else
        handle_failure(result[:errors], redirect_params: {new: "{feature}"})
      end
    end

    def update
      result = service.update(params[:id], item_params)

      if result[:success]
        redirect_to admin_portal_{feature}_path, notice: "Updated successfully."
      else
        handle_failure(result[:errors], redirect_params: {edit: params[:id]})
      end
    end

    def destroy
      result = service.destroy(params[:id])

      if result[:success]
        redirect_to admin_portal_{feature}_path, notice: "Deleted successfully."
      else
        handle_failure(result[:errors], redirect_params: {})
      end
    end

    private

    def service
      @service ||= AdminPortal::{Feature}Service.new(key_format: :camel)
    end

    def item_params
      params.require(:{feature}).permit(:field1, :field2, :field3)
    end

    def handle_failure(errors, redirect_params:)
      flash[:alert] = extract_error_message(errors)
      redirect_to admin_portal_{feature}_path(redirect_params), inertia: {errors: errors || {}}
    end

    def extract_error_message(errors)
      return "Operation failed." if errors.blank?
      messages = errors[:fullMessages] || errors[:full_messages]
      Array(messages).first || "Operation failed."
    end

    def ensure_admin!
      return if current_user&.admin.present?
      redirect_to authenticated_root_path, alert: "Access denied."
    end
  end
end
```

**Reference Implementation**: `app/controllers/admin_portal/vouchers_controller.rb`, `app/controllers/admin_portal/feature_flags_controller.rb`

---

### Step 4: Add Routes

**Location**: `config/routes.rb`

Add routes inside the `admin_portal` namespace:

```ruby
namespace :admin_portal, path: "admin-portal" do
  # Standard RESTful routes
  resources :{feature}, path: "{feature-path}", only: [:index, :create, :update, :destroy]
  
  # Or with custom actions
  resources :{feature}, path: "{feature-path}", only: [:index] do
    collection do
      post "custom-action" => "{feature}#custom_action"
    end
  end
end
```

---

### Step 5: Add Route to Shared Props

**Location**: `app/controllers/concerns/inertia_admin_portal.rb`

Add the route to make it available in frontend:

```ruby
inertia_share adminPortal: -> {
  deep_transform_keys_to_camel_case({
    router: {
      admin_portal: {
        # ... existing routes ...
        {feature}: {feature}_menu,
      }
    }
  })
}

private

def {feature}_menu
  return if current_user&.admin.blank?  # Authorization check
  {index: admin_portal_{feature}_path}
end
```

---

### Step 6: Add TypeScript Types

**Location**: `app/frontend/types/admin-portal/{feature}.ts`

```typescript
export interface {Feature} {
  id: string;
  field1: string;
  field2: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

**Location**: `app/frontend/types/globals.d.ts`

Add route types:

```typescript
export interface AdminPortal {
  router: {
    adminPortal: {
      // ... existing routes ...
      {feature}: {
        index: string;
      };
    };
  };
}
```

---

### Step 7: Create Frontend Page

**Location**: `app/frontend/pages/AdminPortal/{Feature}/Index.tsx`

**Key Patterns**:

```typescript
import { Deferred, Head, router, usePage } from "@inertiajs/react";
import type { GlobalPageProps } from "@/types/globals";

interface PageProps {
  items: {Feature}[];
}

export default function Index({ items }: PageProps) {
  const { props: globalProps, url: pageURL } = usePage<GlobalPageProps & PageProps>();
  const indexRoute = globalProps.adminPortal?.router?.adminPortal?.{feature}?.index;

  // CREATE - Navigate to form or open dialog
  const handleCreate = () => {
    router.get(pageURL, { new: "{feature}" }, {
      only: ["flash", "adminPortal"],
      preserveState: true,
      replace: true,
    });
  };

  // UPDATE via form submission
  const handleUpdate = (id: string, data: FormData) => {
    router.put(`${indexRoute}/${id}`, { {feature}: data }, {
      preserveScroll: true,
      preserveState: true,
    });
  };

  // DELETE with confirmation
  const handleDelete = (id: string) => {
    router.delete(`${indexRoute}/${id}`, {
      preserveScroll: true,
      preserveState: true,
    });
  };

  // Quick toggle (for boolean fields)
  const handleToggle = (item: {Feature}) => {
    router.post(indexRoute, {
      {feature}: { id: item.id, isActive: !item.isActive }
    }, {
      preserveScroll: true,
      preserveState: true,
    });
  };

  return (
    <>
      <Head title="{Feature} Management" />
      <Deferred data={["items"]} fallback={<Skeleton />}>
        <DataTable columns={columns} data={items} />
      </Deferred>
    </>
  );
}
```

**Reference Implementation**: `app/frontend/pages/AdminPortal/Voucher/Index.tsx`, `app/frontend/pages/AdminPortal/FeatureFlag/Index.tsx`

---

### Step 8: Add Navigation (Optional)

**Location**: `app/frontend/components/providers/navigation-provider.tsx`

```typescript
import { SomeIcon } from "lucide-react";

// Inside navMainProps useMemo:
const build{Feature}Menu = () => {
  const subItems = [
    {
      title: t("{feature}"),
      url: adminPortal.{feature}.index,
      isActive: false,
    },
  ];

  return createMenuItem(
    t("menu_group"),
    adminPortal.{feature}.index,
    SomeIcon,
    subItems,
  );
};

// Add to menus array (with authorization check if needed):
const menus = [
  // ... existing menus ...
  ...(currentUserType === "ADMIN" ? [build{Feature}Menu()] : []),
];
```

---

### Step 9: Add Translations

**Location**: `public/locales/en/side-menu.json` and `public/locales/id/side-menu.json`

```json
{
  "{feature}": "Feature Name",
  "menu_group": "Menu Group Name"
}
```

---

## External API Client

**Location**: `app/services/fisiohome_api/client.rb`

The client provides these methods:

```ruby
FisiohomeApi::Client.get(path, params: {}, headers: {})
FisiohomeApi::Client.post(path, body: {}, headers: {})
FisiohomeApi::Client.put(path, body: {}, headers: {})
FisiohomeApi::Client.delete(path, params: {}, headers: {})
```

**Authentication**: Automatically adds `X-Service-Name` and `X-Service-Token` headers from environment variables.

**Response Handling**: Returns Faraday::Response with:
- `response.success?` - boolean
- `response.status` - HTTP status code
- `response.body` - parsed JSON (Hash with indifferent access)

---

## Common Patterns

### Key Format Transformation

The service layer handles key transformation between snake_case (Ruby) and camelCase (JavaScript):

```ruby
# In service: key_format: :camel for frontend consumption
service = AdminPortal::SomeService.new(key_format: :camel)

# Data returned will have camelCase keys:
# { isEnabled: true, createdAt: "..." }
```

### Deferred Loading (Inertia)

Use `InertiaRails.defer` for data that can load after initial page render:

```ruby
render inertia: "Page", props: {
  items: InertiaRails.defer { expensive_query },
  staticData: simple_data  # Loads immediately
}
```

Frontend handles with `<Deferred>`:

```tsx
<Deferred data={["items"]} fallback={<Skeleton />}>
  <DataTable data={items} />
</Deferred>
```

### Error Handling Pattern

```ruby
# Service returns consistent format:
{ success: true, item: {...} }
{ success: false, errors: { fullMessages: ["Error message"] } }

# Controller handles:
if result[:success]
  redirect_with_success
else
  redirect_with_errors(result[:errors])
end
```

### URL Query Parameters for UI State

```typescript
// Open create dialog via URL
router.get(pageURL, { new: "feature" }, { preserveState: true });

// Check in component
const isCreateMode = globalProps.adminPortal?.currentQuery?.new === "feature";
```

---

## Checklist for New CRUD Feature

- [ ] Create model: `app/models/{feature}.rb`
- [ ] Create service: `app/services/admin_portal/{feature}_service.rb`
- [ ] Create controller: `app/controllers/admin_portal/{feature}_controller.rb`
- [ ] Add routes: `config/routes.rb`
- [ ] Add shared props: `app/controllers/concerns/inertia_admin_portal.rb`
- [ ] Create types: `app/frontend/types/admin-portal/{feature}.ts`
- [ ] Update globals types: `app/frontend/types/globals.d.ts`
- [ ] Create page: `app/frontend/pages/AdminPortal/{Feature}/Index.tsx`
- [ ] Add navigation: `app/frontend/components/providers/navigation-provider.tsx`
- [ ] Add translations: `public/locales/{en,id}/side-menu.json`
- [ ] Verify routes: `bin/rails routes | grep {feature}`
- [ ] Test TypeScript: `bunx tsc --noEmit`

---

## Example Prompt for AI

When asking AI to implement a new CRUD feature, provide:

1. **Feature name** and its purpose
2. **External API endpoints** with request/response examples
3. **Data structure** (fields and types)
4. **Authorization requirements** (who can access)
5. **Navigation location** (which menu/submenu)

**Example**:

> Implement a "Promotions" management feature. The external API endpoints are:
> - GET `/api/v1/promotions` - list all promotions
> - POST `/api/v1/promotions` - create promotion
> - PUT `/api/v1/promotions/:id` - update promotion  
> - DELETE `/api/v1/promotions/:id` - delete promotion
>
> Fields: id, title, description, discount_percentage, start_date, end_date, is_active
> Access: Admin only
> Navigation: Under "Marketing" submenu
