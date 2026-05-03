export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          browser: string | null
          created_at: string
          details: Json | null
          device_type: string | null
          error_message: string | null
          establishment_id: string | null
          establishment_name: string | null
          id: string
          ip_address: string | null
          location_city: string | null
          location_country: string | null
          location_state: string | null
          os: string | null
          resource_id: string | null
          resource_name: string | null
          resource_type: string | null
          result: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
          user_role: string | null
        }
        Insert: {
          action: string
          browser?: string | null
          created_at?: string
          details?: Json | null
          device_type?: string | null
          error_message?: string | null
          establishment_id?: string | null
          establishment_name?: string | null
          id?: string
          ip_address?: string | null
          location_city?: string | null
          location_country?: string | null
          location_state?: string | null
          os?: string | null
          resource_id?: string | null
          resource_name?: string | null
          resource_type?: string | null
          result?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_role?: string | null
        }
        Update: {
          action?: string
          browser?: string | null
          created_at?: string
          details?: Json | null
          device_type?: string | null
          error_message?: string | null
          establishment_id?: string | null
          establishment_name?: string | null
          id?: string
          ip_address?: string | null
          location_city?: string | null
          location_country?: string | null
          location_state?: string | null
          os?: string | null
          resource_id?: string | null
          resource_name?: string | null
          resource_type?: string | null
          result?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      banners: {
        Row: {
          created_at: string | null
          display_order: number | null
          ends_at: string | null
          establishment_id: string | null
          id: string
          image_url: string
          is_active: boolean | null
          link_id: string | null
          link_type: string | null
          link_url: string | null
          starts_at: string | null
          subtitle: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          ends_at?: string | null
          establishment_id?: string | null
          id?: string
          image_url: string
          is_active?: boolean | null
          link_id?: string | null
          link_type?: string | null
          link_url?: string | null
          starts_at?: string | null
          subtitle?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          ends_at?: string | null
          establishment_id?: string | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          link_id?: string | null
          link_type?: string | null
          link_url?: string | null
          starts_at?: string | null
          subtitle?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "banners_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          created_at: string | null
          establishment_id: string | null
          id: string
          logo_url: string | null
          name: string
        }
        Insert: {
          created_at?: string | null
          establishment_id?: string | null
          id?: string
          logo_url?: string | null
          name: string
        }
        Update: {
          created_at?: string | null
          establishment_id?: string | null
          id?: string
          logo_url?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "brands_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string | null
          current_uses: number | null
          description: string | null
          discount_type: string | null
          discount_value: number
          establishment_id: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          minimum_order_value: number | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          current_uses?: number | null
          description?: string | null
          discount_type?: string | null
          discount_value: number
          establishment_id?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          minimum_order_value?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          current_uses?: number | null
          description?: string | null
          discount_type?: string | null
          discount_value?: number
          establishment_id?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          minimum_order_value?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupons_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      establishment_members: {
        Row: {
          created_at: string | null
          establishment_id: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          establishment_id: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          establishment_id?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "establishment_members_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      establishment_settings: {
        Row: {
          address: string | null
          created_at: string | null
          default_theme: string | null
          delivery_cep: string | null
          delivery_city: string | null
          delivery_fee: number | null
          delivery_state: string | null
          email: string | null
          establishment_id: string
          facebook_url: string | null
          free_delivery_threshold: number | null
          id: string
          instagram_url: string | null
          minimum_order_value: number | null
          opening_hours: Json | null
          phone: string | null
          primary_color: string | null
          secondary_color: string | null
          show_age_restriction: boolean | null
          tiktok_url: string | null
          updated_at: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          default_theme?: string | null
          delivery_cep?: string | null
          delivery_city?: string | null
          delivery_fee?: number | null
          delivery_state?: string | null
          email?: string | null
          establishment_id: string
          facebook_url?: string | null
          free_delivery_threshold?: number | null
          id?: string
          instagram_url?: string | null
          minimum_order_value?: number | null
          opening_hours?: Json | null
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          show_age_restriction?: boolean | null
          tiktok_url?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          default_theme?: string | null
          delivery_cep?: string | null
          delivery_city?: string | null
          delivery_fee?: number | null
          delivery_state?: string | null
          email?: string | null
          establishment_id?: string
          facebook_url?: string | null
          free_delivery_threshold?: number | null
          id?: string
          instagram_url?: string | null
          minimum_order_value?: number | null
          opening_hours?: Json | null
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          show_age_restriction?: boolean | null
          tiktok_url?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "establishment_settings_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: true
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      establishments: {
        Row: {
          cnpj_cpf: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          email: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          owner_id: string | null
          plan_id: string | null
          slug: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          cnpj_cpf?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          owner_id?: string | null
          plan_id?: string | null
          slug: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          cnpj_cpf?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          owner_id?: string | null
          plan_id?: string | null
          slug?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "establishments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string | null
          description: string | null
          establishment_id: string | null
          event_date: string
          event_time: string
          id: string
          image_url: string | null
          is_active: boolean | null
          location: string | null
          map_image_url: string | null
          name: string
          youtube_url: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          establishment_id?: string | null
          event_date: string
          event_time: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          location?: string | null
          map_image_url?: string | null
          name: string
          youtube_url?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          establishment_id?: string | null
          event_date?: string
          event_time?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          location?: string | null
          map_image_url?: string | null
          name?: string
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          description: string
          establishment_id: string
          expense_date: string
          id: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          description: string
          establishment_id: string
          expense_date?: string
          id?: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          description?: string
          establishment_id?: string
          expense_date?: string
          id?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_page_settings: {
        Row: {
          banner_button_link: string | null
          banner_button_text: string | null
          banner_description: string | null
          banner_enabled: boolean | null
          banner_image_url: string | null
          banner_mobile_image_url: string | null
          banner_title: string | null
          benefits_badge: string | null
          benefits_cards: Json | null
          benefits_subtitle: string | null
          benefits_title: string | null
          benefits_visible: boolean | null
          created_at: string | null
          cta_button_link: string | null
          cta_button_text: string | null
          cta_social_proof: string | null
          cta_subtitle: string | null
          cta_title: string | null
          cta_visible: boolean | null
          features_badge: string | null
          features_cards: Json | null
          features_subtitle: string | null
          features_title: string | null
          features_visible: boolean | null
          footer_contact_url: string | null
          footer_description: string | null
          footer_facebook_url: string | null
          footer_help_url: string | null
          footer_instagram_url: string | null
          footer_linkedin_url: string | null
          footer_privacy_url: string | null
          footer_terms_url: string | null
          footer_visible: boolean | null
          hero_badge_text: string | null
          hero_cta_link: string | null
          hero_cta_text: string | null
          hero_secondary_btn_link: string | null
          hero_secondary_btn_text: string | null
          hero_secondary_btn_visible: boolean | null
          hero_subtitle: string | null
          hero_title: string | null
          hero_trust1: string | null
          hero_trust2: string | null
          hero_trust3: string | null
          hero_visible: boolean | null
          id: string
          logo_url: string | null
          navbar_cta_link: string | null
          navbar_cta_text: string | null
          painpoints_badge: string | null
          painpoints_cards: Json | null
          painpoints_solution_subtitle: string | null
          painpoints_solution_title: string | null
          painpoints_subtitle: string | null
          painpoints_title: string | null
          painpoints_visible: boolean | null
          pricing_badge: string | null
          pricing_promo_text: string | null
          pricing_title: string | null
          pricing_visible: boolean | null
          updated_at: string | null
        }
        Insert: {
          banner_button_link?: string | null
          banner_button_text?: string | null
          banner_description?: string | null
          banner_enabled?: boolean | null
          banner_image_url?: string | null
          banner_mobile_image_url?: string | null
          banner_title?: string | null
          benefits_badge?: string | null
          benefits_cards?: Json | null
          benefits_subtitle?: string | null
          benefits_title?: string | null
          benefits_visible?: boolean | null
          created_at?: string | null
          cta_button_link?: string | null
          cta_button_text?: string | null
          cta_social_proof?: string | null
          cta_subtitle?: string | null
          cta_title?: string | null
          cta_visible?: boolean | null
          features_badge?: string | null
          features_cards?: Json | null
          features_subtitle?: string | null
          features_title?: string | null
          features_visible?: boolean | null
          footer_contact_url?: string | null
          footer_description?: string | null
          footer_facebook_url?: string | null
          footer_help_url?: string | null
          footer_instagram_url?: string | null
          footer_linkedin_url?: string | null
          footer_privacy_url?: string | null
          footer_terms_url?: string | null
          footer_visible?: boolean | null
          hero_badge_text?: string | null
          hero_cta_link?: string | null
          hero_cta_text?: string | null
          hero_secondary_btn_link?: string | null
          hero_secondary_btn_text?: string | null
          hero_secondary_btn_visible?: boolean | null
          hero_subtitle?: string | null
          hero_title?: string | null
          hero_trust1?: string | null
          hero_trust2?: string | null
          hero_trust3?: string | null
          hero_visible?: boolean | null
          id?: string
          logo_url?: string | null
          navbar_cta_link?: string | null
          navbar_cta_text?: string | null
          painpoints_badge?: string | null
          painpoints_cards?: Json | null
          painpoints_solution_subtitle?: string | null
          painpoints_solution_title?: string | null
          painpoints_subtitle?: string | null
          painpoints_title?: string | null
          painpoints_visible?: boolean | null
          pricing_badge?: string | null
          pricing_promo_text?: string | null
          pricing_title?: string | null
          pricing_visible?: boolean | null
          updated_at?: string | null
        }
        Update: {
          banner_button_link?: string | null
          banner_button_text?: string | null
          banner_description?: string | null
          banner_enabled?: boolean | null
          banner_image_url?: string | null
          banner_mobile_image_url?: string | null
          banner_title?: string | null
          benefits_badge?: string | null
          benefits_cards?: Json | null
          benefits_subtitle?: string | null
          benefits_title?: string | null
          benefits_visible?: boolean | null
          created_at?: string | null
          cta_button_link?: string | null
          cta_button_text?: string | null
          cta_social_proof?: string | null
          cta_subtitle?: string | null
          cta_title?: string | null
          cta_visible?: boolean | null
          features_badge?: string | null
          features_cards?: Json | null
          features_subtitle?: string | null
          features_title?: string | null
          features_visible?: boolean | null
          footer_contact_url?: string | null
          footer_description?: string | null
          footer_facebook_url?: string | null
          footer_help_url?: string | null
          footer_instagram_url?: string | null
          footer_linkedin_url?: string | null
          footer_privacy_url?: string | null
          footer_terms_url?: string | null
          footer_visible?: boolean | null
          hero_badge_text?: string | null
          hero_cta_link?: string | null
          hero_cta_text?: string | null
          hero_secondary_btn_link?: string | null
          hero_secondary_btn_text?: string | null
          hero_secondary_btn_visible?: boolean | null
          hero_subtitle?: string | null
          hero_title?: string | null
          hero_trust1?: string | null
          hero_trust2?: string | null
          hero_trust3?: string | null
          hero_visible?: boolean | null
          id?: string
          logo_url?: string | null
          navbar_cta_link?: string | null
          navbar_cta_text?: string | null
          painpoints_badge?: string | null
          painpoints_cards?: Json | null
          painpoints_solution_subtitle?: string | null
          painpoints_solution_title?: string | null
          painpoints_subtitle?: string | null
          painpoints_title?: string | null
          painpoints_visible?: boolean | null
          pricing_badge?: string | null
          pricing_promo_text?: string | null
          pricing_title?: string | null
          pricing_visible?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      logs_access_audit: {
        Row: {
          action: string
          created_at: string
          filters_applied: Json | null
          id: string
          ip_address: string | null
          records_accessed: number | null
          user_email: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          filters_applied?: Json | null
          id?: string
          ip_address?: string | null
          records_accessed?: number | null
          user_email?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          filters_applied?: Json | null
          id?: string
          ip_address?: string | null
          records_accessed?: number | null
          user_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      manual_entries: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          description: string
          entry_date: string
          establishment_id: string
          id: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          description: string
          entry_date?: string
          establishment_id: string
          id?: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          description?: string
          entry_date?: string
          establishment_id?: string
          id?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_entries_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          product_id: string | null
          product_image: string | null
          product_name: string
          quantity: number
          specifications: Json | null
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          product_id?: string | null
          product_image?: string | null
          product_name: string
          quantity: number
          specifications?: Json | null
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          product_id?: string | null
          product_image?: string | null
          product_name?: string
          quantity?: number
          specifications?: Json | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cash_amount: number | null
          created_at: string | null
          delivery_address: Json | null
          delivery_fee: number | null
          discount: number | null
          establishment_id: string | null
          id: string
          notes: string | null
          order_observations: string | null
          payment_method: string | null
          seller_id: string | null
          status: string | null
          subtotal: number
          total: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          cash_amount?: number | null
          created_at?: string | null
          delivery_address?: Json | null
          delivery_fee?: number | null
          discount?: number | null
          establishment_id?: string | null
          id?: string
          notes?: string | null
          order_observations?: string | null
          payment_method?: string | null
          seller_id?: string | null
          status?: string | null
          subtotal: number
          total: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          cash_amount?: number | null
          created_at?: string | null
          delivery_address?: Json | null
          delivery_fee?: number | null
          discount?: number | null
          establishment_id?: string | null
          id?: string
          notes?: string | null
          order_observations?: string | null
          payment_method?: string | null
          seller_id?: string | null
          status?: string | null
          subtotal?: number
          total?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          billing_cycle: string
          created_at: string | null
          cta_link: string | null
          cta_text: string | null
          description: string | null
          features: Json | null
          has_banners: boolean | null
          has_brands: boolean | null
          has_catalog_only: boolean | null
          has_categories: boolean | null
          has_coupons: boolean | null
          has_customers: boolean | null
          has_events: boolean | null
          has_financial: boolean | null
          has_orders: boolean | null
          has_overview: boolean | null
          has_pdv: boolean | null
          has_products: boolean | null
          has_reports: boolean | null
          has_service_notes: boolean | null
          has_settings: boolean | null
          has_virtual_store: boolean | null
          has_wallet: boolean | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          landing_features: string[] | null
          max_brands: number | null
          max_categories: number | null
          max_products: number | null
          name: string
          price: number
          promo_period: string | null
          promo_price: number | null
          show_on_landing: boolean | null
          updated_at: string | null
        }
        Insert: {
          billing_cycle?: string
          created_at?: string | null
          cta_link?: string | null
          cta_text?: string | null
          description?: string | null
          features?: Json | null
          has_banners?: boolean | null
          has_brands?: boolean | null
          has_catalog_only?: boolean | null
          has_categories?: boolean | null
          has_coupons?: boolean | null
          has_customers?: boolean | null
          has_events?: boolean | null
          has_financial?: boolean | null
          has_orders?: boolean | null
          has_overview?: boolean | null
          has_pdv?: boolean | null
          has_products?: boolean | null
          has_reports?: boolean | null
          has_service_notes?: boolean | null
          has_settings?: boolean | null
          has_virtual_store?: boolean | null
          has_wallet?: boolean | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          landing_features?: string[] | null
          max_brands?: number | null
          max_categories?: number | null
          max_products?: number | null
          name: string
          price?: number
          promo_period?: string | null
          promo_price?: number | null
          show_on_landing?: boolean | null
          updated_at?: string | null
        }
        Update: {
          billing_cycle?: string
          created_at?: string | null
          cta_link?: string | null
          cta_text?: string | null
          description?: string | null
          features?: Json | null
          has_banners?: boolean | null
          has_brands?: boolean | null
          has_catalog_only?: boolean | null
          has_categories?: boolean | null
          has_coupons?: boolean | null
          has_customers?: boolean | null
          has_events?: boolean | null
          has_financial?: boolean | null
          has_orders?: boolean | null
          has_overview?: boolean | null
          has_pdv?: boolean | null
          has_products?: boolean | null
          has_reports?: boolean | null
          has_service_notes?: boolean | null
          has_settings?: boolean | null
          has_virtual_store?: boolean | null
          has_wallet?: boolean | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          landing_features?: string[] | null
          max_brands?: number | null
          max_categories?: number | null
          max_products?: number | null
          name?: string
          price?: number
          promo_period?: string | null
          promo_price?: number | null
          show_on_landing?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      platform_fee_logs: {
        Row: {
          changed_at: string | null
          changed_by: string
          field_changed: string
          id: string
          new_value: number | null
          old_value: number | null
        }
        Insert: {
          changed_at?: string | null
          changed_by: string
          field_changed: string
          id?: string
          new_value?: number | null
          old_value?: number | null
        }
        Update: {
          changed_at?: string | null
          changed_by?: string
          field_changed?: string
          id?: string
          new_value?: number | null
          old_value?: number | null
        }
        Relationships: []
      }
      platform_fees: {
        Row: {
          created_at: string | null
          customer_credit_10x_fixed: number
          customer_credit_10x_percentage: number
          customer_credit_11x_fixed: number
          customer_credit_11x_percentage: number
          customer_credit_12x_fixed: number
          customer_credit_12x_percentage: number
          customer_credit_1x_fixed: number
          customer_credit_1x_percentage: number
          customer_credit_2x_fixed: number
          customer_credit_2x_percentage: number
          customer_credit_3x_fixed: number
          customer_credit_3x_percentage: number
          customer_credit_4x_fixed: number
          customer_credit_4x_percentage: number
          customer_credit_5x_fixed: number
          customer_credit_5x_percentage: number
          customer_credit_6x_fixed: number
          customer_credit_6x_percentage: number
          customer_credit_7x_fixed: number
          customer_credit_7x_percentage: number
          customer_credit_8x_fixed: number
          customer_credit_8x_percentage: number
          customer_credit_9x_fixed: number
          customer_credit_9x_percentage: number
          customer_pix_fixed: number
          customer_pix_percentage: number
          customer_product_fixed: number
          customer_product_percentage: number
          customer_ticket_minimum: number
          customer_ticket_percentage: number
          gateway_credit_10x_fixed: number
          gateway_credit_10x_percentage: number
          gateway_credit_11x_fixed: number
          gateway_credit_11x_percentage: number
          gateway_credit_12x_fixed: number
          gateway_credit_12x_percentage: number
          gateway_credit_1x_fixed: number
          gateway_credit_1x_percentage: number
          gateway_credit_2x_fixed: number
          gateway_credit_2x_percentage: number
          gateway_credit_3x_fixed: number
          gateway_credit_3x_percentage: number
          gateway_credit_4x_fixed: number
          gateway_credit_4x_percentage: number
          gateway_credit_5x_fixed: number
          gateway_credit_5x_percentage: number
          gateway_credit_6x_fixed: number
          gateway_credit_6x_percentage: number
          gateway_credit_7x_fixed: number
          gateway_credit_7x_percentage: number
          gateway_credit_8x_fixed: number
          gateway_credit_8x_percentage: number
          gateway_credit_9x_fixed: number
          gateway_credit_9x_percentage: number
          gateway_credit_fixed: number
          gateway_credit_percentage: number
          gateway_pix_fixed: number
          gateway_pix_percentage: number
          id: string
          is_active: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_credit_10x_fixed?: number
          customer_credit_10x_percentage?: number
          customer_credit_11x_fixed?: number
          customer_credit_11x_percentage?: number
          customer_credit_12x_fixed?: number
          customer_credit_12x_percentage?: number
          customer_credit_1x_fixed?: number
          customer_credit_1x_percentage?: number
          customer_credit_2x_fixed?: number
          customer_credit_2x_percentage?: number
          customer_credit_3x_fixed?: number
          customer_credit_3x_percentage?: number
          customer_credit_4x_fixed?: number
          customer_credit_4x_percentage?: number
          customer_credit_5x_fixed?: number
          customer_credit_5x_percentage?: number
          customer_credit_6x_fixed?: number
          customer_credit_6x_percentage?: number
          customer_credit_7x_fixed?: number
          customer_credit_7x_percentage?: number
          customer_credit_8x_fixed?: number
          customer_credit_8x_percentage?: number
          customer_credit_9x_fixed?: number
          customer_credit_9x_percentage?: number
          customer_pix_fixed?: number
          customer_pix_percentage?: number
          customer_product_fixed?: number
          customer_product_percentage?: number
          customer_ticket_minimum?: number
          customer_ticket_percentage?: number
          gateway_credit_10x_fixed?: number
          gateway_credit_10x_percentage?: number
          gateway_credit_11x_fixed?: number
          gateway_credit_11x_percentage?: number
          gateway_credit_12x_fixed?: number
          gateway_credit_12x_percentage?: number
          gateway_credit_1x_fixed?: number
          gateway_credit_1x_percentage?: number
          gateway_credit_2x_fixed?: number
          gateway_credit_2x_percentage?: number
          gateway_credit_3x_fixed?: number
          gateway_credit_3x_percentage?: number
          gateway_credit_4x_fixed?: number
          gateway_credit_4x_percentage?: number
          gateway_credit_5x_fixed?: number
          gateway_credit_5x_percentage?: number
          gateway_credit_6x_fixed?: number
          gateway_credit_6x_percentage?: number
          gateway_credit_7x_fixed?: number
          gateway_credit_7x_percentage?: number
          gateway_credit_8x_fixed?: number
          gateway_credit_8x_percentage?: number
          gateway_credit_9x_fixed?: number
          gateway_credit_9x_percentage?: number
          gateway_credit_fixed?: number
          gateway_credit_percentage?: number
          gateway_pix_fixed?: number
          gateway_pix_percentage?: number
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_credit_10x_fixed?: number
          customer_credit_10x_percentage?: number
          customer_credit_11x_fixed?: number
          customer_credit_11x_percentage?: number
          customer_credit_12x_fixed?: number
          customer_credit_12x_percentage?: number
          customer_credit_1x_fixed?: number
          customer_credit_1x_percentage?: number
          customer_credit_2x_fixed?: number
          customer_credit_2x_percentage?: number
          customer_credit_3x_fixed?: number
          customer_credit_3x_percentage?: number
          customer_credit_4x_fixed?: number
          customer_credit_4x_percentage?: number
          customer_credit_5x_fixed?: number
          customer_credit_5x_percentage?: number
          customer_credit_6x_fixed?: number
          customer_credit_6x_percentage?: number
          customer_credit_7x_fixed?: number
          customer_credit_7x_percentage?: number
          customer_credit_8x_fixed?: number
          customer_credit_8x_percentage?: number
          customer_credit_9x_fixed?: number
          customer_credit_9x_percentage?: number
          customer_pix_fixed?: number
          customer_pix_percentage?: number
          customer_product_fixed?: number
          customer_product_percentage?: number
          customer_ticket_minimum?: number
          customer_ticket_percentage?: number
          gateway_credit_10x_fixed?: number
          gateway_credit_10x_percentage?: number
          gateway_credit_11x_fixed?: number
          gateway_credit_11x_percentage?: number
          gateway_credit_12x_fixed?: number
          gateway_credit_12x_percentage?: number
          gateway_credit_1x_fixed?: number
          gateway_credit_1x_percentage?: number
          gateway_credit_2x_fixed?: number
          gateway_credit_2x_percentage?: number
          gateway_credit_3x_fixed?: number
          gateway_credit_3x_percentage?: number
          gateway_credit_4x_fixed?: number
          gateway_credit_4x_percentage?: number
          gateway_credit_5x_fixed?: number
          gateway_credit_5x_percentage?: number
          gateway_credit_6x_fixed?: number
          gateway_credit_6x_percentage?: number
          gateway_credit_7x_fixed?: number
          gateway_credit_7x_percentage?: number
          gateway_credit_8x_fixed?: number
          gateway_credit_8x_percentage?: number
          gateway_credit_9x_fixed?: number
          gateway_credit_9x_percentage?: number
          gateway_credit_fixed?: number
          gateway_credit_percentage?: number
          gateway_pix_fixed?: number
          gateway_pix_percentage?: number
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          created_at: string | null
          display_order: number | null
          establishment_id: string | null
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          establishment_id?: string | null
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          establishment_id?: string | null
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          image_url: string
          product_id: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url: string
          product_id: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          is_required: boolean | null
          name: string
          options: string[]
          product_id: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_required?: boolean | null
          name: string
          options?: string[]
          product_id: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_required?: boolean | null
          name?: string
          options?: string[]
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean | null
          alcohol_content: string | null
          brand_id: string | null
          category_id: string | null
          cost_price: number | null
          created_at: string | null
          description: string | null
          establishment_id: string | null
          id: string
          image_url: string | null
          is_featured: boolean | null
          is_on_sale: boolean | null
          name: string
          price: number
          rating: number | null
          reviews_count: number | null
          sale_price: number | null
          sales_count: number | null
          stock: number | null
          updated_at: string | null
          volume: string | null
        }
        Insert: {
          active?: boolean | null
          alcohol_content?: string | null
          brand_id?: string | null
          category_id?: string | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          establishment_id?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          is_on_sale?: boolean | null
          name: string
          price: number
          rating?: number | null
          reviews_count?: number | null
          sale_price?: number | null
          sales_count?: number | null
          stock?: number | null
          updated_at?: string | null
          volume?: string | null
        }
        Update: {
          active?: boolean | null
          alcohol_content?: string | null
          brand_id?: string | null
          category_id?: string | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          establishment_id?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          is_on_sale?: boolean | null
          name?: string
          price?: number
          rating?: number | null
          reviews_count?: number | null
          sale_price?: number | null
          sales_count?: number | null
          stock?: number | null
          updated_at?: string | null
          volume?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          cep: string | null
          city: string | null
          created_at: string | null
          email: string | null
          establishment_id: string | null
          full_name: string | null
          id: string
          neighborhood: string | null
          number: string | null
          original_email: string | null
          phone: string | null
          points: number | null
          state: string | null
          street: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          cep?: string | null
          city?: string | null
          created_at?: string | null
          email?: string | null
          establishment_id?: string | null
          full_name?: string | null
          id: string
          neighborhood?: string | null
          number?: string | null
          original_email?: string | null
          phone?: string | null
          points?: number | null
          state?: string | null
          street?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          cep?: string | null
          city?: string | null
          created_at?: string | null
          email?: string | null
          establishment_id?: string | null
          full_name?: string | null
          id?: string
          neighborhood?: string | null
          number?: string | null
          original_email?: string | null
          phone?: string | null
          points?: number | null
          state?: string | null
          street?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      security_alerts: {
        Row: {
          alert_type: string
          created_at: string
          description: string
          establishment_id: string | null
          id: string
          ip_address: string | null
          is_resolved: boolean | null
          location: string | null
          metadata: Json | null
          resolved_at: string | null
          resolved_by: string | null
          resolved_note: string | null
          severity: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          alert_type: string
          created_at?: string
          description: string
          establishment_id?: string | null
          id?: string
          ip_address?: string | null
          is_resolved?: boolean | null
          location?: string | null
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_note?: string | null
          severity?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string
          description?: string
          establishment_id?: string | null
          id?: string
          ip_address?: string | null
          is_resolved?: boolean | null
          location?: string | null
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_note?: string | null
          severity?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_alerts_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      store_settings: {
        Row: {
          address: string | null
          created_at: string | null
          default_theme: string | null
          delivery_cep: string | null
          delivery_city: string | null
          delivery_fee: number | null
          delivery_state: string | null
          email: string | null
          facebook_url: string | null
          free_delivery_threshold: number | null
          id: string
          instagram_url: string | null
          minimum_order_value: number | null
          opening_hours: Json | null
          phone: string | null
          primary_color: string | null
          secondary_color: string | null
          show_age_restriction: boolean | null
          store_description: string | null
          store_logo_url: string | null
          store_name: string | null
          tiktok_url: string | null
          updated_at: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          default_theme?: string | null
          delivery_cep?: string | null
          delivery_city?: string | null
          delivery_fee?: number | null
          delivery_state?: string | null
          email?: string | null
          facebook_url?: string | null
          free_delivery_threshold?: number | null
          id?: string
          instagram_url?: string | null
          minimum_order_value?: number | null
          opening_hours?: Json | null
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          show_age_restriction?: boolean | null
          store_description?: string | null
          store_logo_url?: string | null
          store_name?: string | null
          tiktok_url?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          default_theme?: string | null
          delivery_cep?: string | null
          delivery_city?: string | null
          delivery_fee?: number | null
          delivery_state?: string | null
          email?: string | null
          facebook_url?: string | null
          free_delivery_threshold?: number | null
          id?: string
          instagram_url?: string | null
          minimum_order_value?: number | null
          opening_hours?: Json | null
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          show_age_restriction?: boolean | null
          store_description?: string | null
          store_logo_url?: string | null
          store_name?: string | null
          tiktok_url?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      ticket_batches: {
        Row: {
          created_at: string | null
          display_order: number | null
          event_id: string
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          event_id: string
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          event_id?: string
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_batches_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_sales: {
        Row: {
          created_at: string | null
          establishment_id: string | null
          event_id: string
          fee_amount: number | null
          id: string
          payment_status: string | null
          quantity: number
          subtotal: number | null
          ticket_type_id: string
          total_price: number
          unit_price: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          establishment_id?: string | null
          event_id: string
          fee_amount?: number | null
          id?: string
          payment_status?: string | null
          quantity?: number
          subtotal?: number | null
          ticket_type_id: string
          total_price: number
          unit_price: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          establishment_id?: string | null
          event_id?: string
          fee_amount?: number | null
          id?: string
          payment_status?: string | null
          quantity?: number
          subtotal?: number | null
          ticket_type_id?: string
          total_price?: number
          unit_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_sales_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_sales_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_sales_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_types: {
        Row: {
          batch_id: string | null
          created_at: string | null
          description: string | null
          event_id: string
          id: string
          is_active: boolean | null
          name: string
          price: number
          quantity_available: number
          quantity_sold: number
        }
        Insert: {
          batch_id?: string | null
          created_at?: string | null
          description?: string | null
          event_id: string
          id?: string
          is_active?: boolean | null
          name: string
          price?: number
          quantity_available?: number
          quantity_sold?: number
        }
        Update: {
          batch_id?: string | null
          created_at?: string | null
          description?: string | null
          event_id?: string
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          quantity_available?: number
          quantity_sold?: number
        }
        Relationships: [
          {
            foreignKeyName: "ticket_types_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "ticket_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          is_validated: boolean | null
          qr_code: string
          ticket_sale_id: string
          ticket_type_id: string
          user_id: string
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          is_validated?: boolean | null
          qr_code: string
          ticket_sale_id: string
          ticket_type_id: string
          user_id: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          is_validated?: boolean | null
          qr_code?: string
          ticket_sale_id?: string
          ticket_type_id?: string
          user_id?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_ticket_sale_id_fkey"
            columns: ["ticket_sale_id"]
            isOneToOne: false
            referencedRelation: "ticket_sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          browser: string | null
          device_type: string | null
          ended_at: string | null
          establishment_id: string | null
          id: string
          ip_address: string | null
          is_active: boolean | null
          last_activity_at: string
          location_city: string | null
          location_state: string | null
          os: string | null
          session_token: string
          started_at: string
          user_email: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          device_type?: string | null
          ended_at?: string | null
          establishment_id?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_activity_at?: string
          location_city?: string | null
          location_state?: string | null
          os?: string | null
          session_token: string
          started_at?: string
          user_email?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          device_type?: string | null
          ended_at?: string | null
          establishment_id?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_activity_at?: string
          location_city?: string | null
          location_state?: string | null
          os?: string | null
          session_token?: string
          started_at?: string
          user_email?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount: number
          available_at: string
          created_at: string
          description: string | null
          establishment_id: string
          id: string
          reference_id: string | null
          type: string
        }
        Insert: {
          amount: number
          available_at?: string
          created_at?: string
          description?: string | null
          establishment_id: string
          id?: string
          reference_id?: string | null
          type: string
        }
        Update: {
          amount?: number
          available_at?: string
          created_at?: string
          description?: string | null
          establishment_id?: string
          id?: string
          reference_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawal_requests: {
        Row: {
          amount: number
          bank_name: string | null
          created_at: string
          document: string | null
          establishment_id: string
          id: string
          notes: string | null
          pix_key: string | null
          pix_key_type: string | null
          processed_at: string | null
          processed_by: string | null
          recipient_name: string | null
          requested_at: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          bank_name?: string | null
          created_at?: string
          document?: string | null
          establishment_id: string
          id?: string
          notes?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          processed_at?: string | null
          processed_by?: string | null
          recipient_name?: string | null
          requested_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          bank_name?: string | null
          created_at?: string
          document?: string | null
          establishment_id?: string
          id?: string
          notes?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          processed_at?: string | null
          processed_by?: string | null
          recipient_name?: string | null
          requested_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_requests_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_establishment_cascade: {
        Args: { _establishment_id: string }
        Returns: undefined
      }
      get_user_establishment_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_establishment_member: {
        Args: { _establishment_id: string; _user_id: string }
        Returns: boolean
      }
      is_establishment_owner: {
        Args: { _establishment_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
