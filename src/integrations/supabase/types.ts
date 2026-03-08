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
      archives: {
        Row: {
          client_name: string
          company_id: string
          created_at: string
          created_by_user: string
          document_number: string
          document_type: string
          id: string
          invoice_id: string | null
          pdf_file_url: string | null
          total_amount: number
        }
        Insert: {
          client_name: string
          company_id: string
          created_at?: string
          created_by_user: string
          document_number: string
          document_type: string
          id?: string
          invoice_id?: string | null
          pdf_file_url?: string | null
          total_amount?: number
        }
        Update: {
          client_name?: string
          company_id?: string
          created_at?: string
          created_by_user?: string
          document_number?: string
          document_type?: string
          id?: string
          invoice_id?: string | null
          pdf_file_url?: string | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "archives_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "archives_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      bom_items: {
        Row: {
          created_at: string
          finished_product_id: string
          id: string
          quantity: number
          raw_material_id: string
          unit_type: string
        }
        Insert: {
          created_at?: string
          finished_product_id: string
          id?: string
          quantity?: number
          raw_material_id: string
          unit_type?: string
        }
        Update: {
          created_at?: string
          finished_product_id?: string
          id?: string
          quantity?: number
          raw_material_id?: string
          unit_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "bom_items_finished_product_id_fkey"
            columns: ["finished_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bom_items_raw_material_id_fkey"
            columns: ["raw_material_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          code_tva: string | null
          company_id: string
          contact_person: string | null
          created_at: string
          email: string | null
          governorate: string | null
          id: string
          is_archived: boolean
          legal_form: Database["public"]["Enums"]["legal_form"] | null
          matricule_fiscal: string | null
          name: string
          payment_terms: string | null
          phone: string | null
          rne: string | null
          status: Database["public"]["Enums"]["client_status"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          code_tva?: string | null
          company_id: string
          contact_person?: string | null
          created_at?: string
          email?: string | null
          governorate?: string | null
          id?: string
          is_archived?: boolean
          legal_form?: Database["public"]["Enums"]["legal_form"] | null
          matricule_fiscal?: string | null
          name: string
          payment_terms?: string | null
          phone?: string | null
          rne?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          code_tva?: string | null
          company_id?: string
          contact_person?: string | null
          created_at?: string
          email?: string | null
          governorate?: string | null
          id?: string
          is_archived?: boolean
          legal_form?: Database["public"]["Enums"]["legal_form"] | null
          matricule_fiscal?: string | null
          name?: string
          payment_terms?: string | null
          phone?: string | null
          rne?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          code_tva: string | null
          created_at: string
          email: string | null
          governorate: string | null
          id: string
          legal_form: Database["public"]["Enums"]["legal_form"] | null
          logo_url: string | null
          matricule_fiscal: string | null
          name: string
          payment_terms: string | null
          phone: string | null
          rne: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          code_tva?: string | null
          created_at?: string
          email?: string | null
          governorate?: string | null
          id?: string
          legal_form?: Database["public"]["Enums"]["legal_form"] | null
          logo_url?: string | null
          matricule_fiscal?: string | null
          name: string
          payment_terms?: string | null
          phone?: string | null
          rne?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          code_tva?: string | null
          created_at?: string
          email?: string | null
          governorate?: string | null
          id?: string
          legal_form?: Database["public"]["Enums"]["legal_form"] | null
          logo_url?: string | null
          matricule_fiscal?: string | null
          name?: string
          payment_terms?: string | null
          phone?: string | null
          rne?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      document_counters: {
        Row: {
          company_id: string
          counter: number
          doc_type: string
          id: string
          year: number
        }
        Insert: {
          company_id: string
          counter?: number
          doc_type: string
          id?: string
          year?: number
        }
        Update: {
          company_id?: string
          counter?: number
          doc_type?: string
          id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_counters_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          amount_ht: number
          category: string
          company_id: string
          created_at: string
          date: string
          description: string
          id: string
          is_recurring: boolean
          recurrence_period: string | null
          supplier_id: string | null
          tva_amount: number
          tva_rate: number
          updated_at: string
        }
        Insert: {
          amount?: number
          amount_ht?: number
          category?: string
          company_id: string
          created_at?: string
          date?: string
          description: string
          id?: string
          is_recurring?: boolean
          recurrence_period?: string | null
          supplier_id?: string | null
          tva_amount?: number
          tva_rate?: number
          updated_at?: string
        }
        Update: {
          amount?: number
          amount_ht?: number
          category?: string
          company_id?: string
          created_at?: string
          date?: string
          description?: string
          id?: string
          is_recurring?: boolean
          recurrence_period?: string | null
          supplier_id?: string | null
          tva_amount?: number
          tva_rate?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          id: string
          invoice_id: string
          product_id: string | null
          product_name: string
          quantity: number
          sort_order: number
          total: number
          tva_rate: number
          unit_price: number
        }
        Insert: {
          id?: string
          invoice_id: string
          product_id?: string | null
          product_name: string
          quantity?: number
          sort_order?: number
          total?: number
          tva_rate?: number
          unit_price?: number
        }
        Update: {
          id?: string
          invoice_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          sort_order?: number
          total?: number
          tva_rate?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          client_id: string | null
          client_name: string
          company_id: string
          created_at: string
          date: string
          discount_amount: number
          due_date: string | null
          id: string
          notes: string | null
          number: string
          paid_amount: number
          payment_terms: string | null
          status: string
          subtotal: number
          total: number
          tva_total: number
          type: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          client_name: string
          company_id: string
          created_at?: string
          date?: string
          discount_amount?: number
          due_date?: string | null
          id?: string
          notes?: string | null
          number: string
          paid_amount?: number
          payment_terms?: string | null
          status?: string
          subtotal?: number
          total?: number
          tva_total?: number
          type: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          client_name?: string
          company_id?: string
          created_at?: string
          date?: string
          discount_amount?: number
          due_date?: string | null
          id?: string
          notes?: string | null
          number?: string
          paid_amount?: number
          payment_terms?: string | null
          status?: string
          subtotal?: number
          total?: number
          tva_total?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          company_id: string
          created_at: string
          id: string
          name: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          category_type: Database["public"]["Enums"]["category_type"]
          company_id: string
          created_at: string
          description: string | null
          id: string
          min_stock: number
          name: string
          product_type: Database["public"]["Enums"]["product_type"]
          purchase_price: number
          selling_price: number
          stock: number
          supplier_id: string | null
          tva_rate: number
          unit: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          category_type?: Database["public"]["Enums"]["category_type"]
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          min_stock?: number
          name: string
          product_type?: Database["public"]["Enums"]["product_type"]
          purchase_price?: number
          selling_price?: number
          stock?: number
          supplier_id?: string | null
          tva_rate?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          category_type?: Database["public"]["Enums"]["category_type"]
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          min_stock?: number
          name?: string
          product_type?: Database["public"]["Enums"]["product_type"]
          purchase_price?: number
          selling_price?: number
          stock?: number
          supplier_id?: string | null
          tva_rate?: number
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_id: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_invoice_items: {
        Row: {
          id: string
          product_id: string | null
          product_name: string
          purchase_invoice_id: string
          quantity: number
          sort_order: number
          total: number
          tva_rate: number
          unit_price: number
        }
        Insert: {
          id?: string
          product_id?: string | null
          product_name: string
          purchase_invoice_id: string
          quantity?: number
          sort_order?: number
          total?: number
          tva_rate?: number
          unit_price?: number
        }
        Update: {
          id?: string
          product_id?: string | null
          product_name?: string
          purchase_invoice_id?: string
          quantity?: number
          sort_order?: number
          total?: number
          tva_rate?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_invoice_items_purchase_invoice_id_fkey"
            columns: ["purchase_invoice_id"]
            isOneToOne: false
            referencedRelation: "purchase_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_invoices: {
        Row: {
          company_id: string
          created_at: string
          date: string
          due_date: string | null
          id: string
          notes: string | null
          number: string
          paid_amount: number
          status: string
          subtotal: number
          supplier_id: string | null
          supplier_name: string
          total: number
          tva_total: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          date?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          number: string
          paid_amount?: number
          status?: string
          subtotal?: number
          supplier_id?: string | null
          supplier_name: string
          total?: number
          tva_total?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          date?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          number?: string
          paid_amount?: number
          status?: string
          subtotal?: number
          supplier_id?: string | null
          supplier_name?: string
          total?: number
          tva_total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          company_id: string
          date: string
          id: string
          product_id: string | null
          product_name: string
          quantity: number
          reason: string | null
          type: string
        }
        Insert: {
          company_id: string
          date?: string
          id?: string
          product_id?: string | null
          product_name: string
          quantity: number
          reason?: string | null
          type: string
        }
        Update: {
          company_id?: string
          date?: string
          id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          reason?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          company_id: string
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          company_id: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          company_id?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_company_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      next_document_number: {
        Args: { _company_id: string; _doc_type: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "employee"
      category_type: "normal" | "matiere_premiere"
      client_status: "active" | "inactive"
      legal_form:
        | "personne_physique"
        | "suarl"
        | "sarl"
        | "sa"
        | "sas"
        | "snc"
        | "autre"
      product_type: "finished_product" | "raw_material" | "service"
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
      app_role: ["admin", "employee"],
      category_type: ["normal", "matiere_premiere"],
      client_status: ["active", "inactive"],
      legal_form: [
        "personne_physique",
        "suarl",
        "sarl",
        "sa",
        "sas",
        "snc",
        "autre",
      ],
      product_type: ["finished_product", "raw_material", "service"],
    },
  },
} as const
