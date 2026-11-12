
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "asistencias": {
                  Row: {
                    "fecha": string,"gym_id": string,"id": string,"origen": string,"socio_id": string,"usuario_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "fecha"?: string,"gym_id": string,"id"?: string,"origen"?: string,"socio_id": string,"usuario_id"?: string | null
                  }
                  Update: {
                    "fecha"?: string,"gym_id"?: string,"id"?: string,"origen"?: string,"socio_id"?: string,"usuario_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "asistencias_gym_id_fkey"
      columns: ["gym_id"]
isOneToOne: false
      referencedRelation: "gyms"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "asistencias_socio_id_fkey"
      columns: ["socio_id"]
isOneToOne: false
      referencedRelation: "socios"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "asistencias_usuario_id_fkey"
      columns: ["usuario_id"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    }
                  ]
                },"auditoria": {
                  Row: {
                    "accion": string,"detalle": string,"fecha": string,"gym_id": string,"id": string,"usuario_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "accion": string,"detalle"?: string,"fecha"?: string,"gym_id": string,"id"?: string,"usuario_id"?: string | null
                  }
                  Update: {
                    "accion"?: string,"detalle"?: string,"fecha"?: string,"gym_id"?: string,"id"?: string,"usuario_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "auditoria_gym_id_fkey"
      columns: ["gym_id"]
isOneToOne: false
      referencedRelation: "gyms"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "auditoria_usuario_id_fkey"
      columns: ["usuario_id"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    }
                  ]
                },"cajas": {
                  Row: {
                    "apertura": string,"cierre": string | null,"gym_id": string,"id": string,"monto_contado": number | null,"monto_inicial": number,"observaciones": string,"usuario_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "apertura"?: string,"cierre"?: string | null,"gym_id": string,"id"?: string,"monto_contado"?: number | null,"monto_inicial": number,"observaciones"?: string,"usuario_id": string
                  }
                  Update: {
                    "apertura"?: string,"cierre"?: string | null,"gym_id"?: string,"id"?: string,"monto_contado"?: number | null,"monto_inicial"?: number,"observaciones"?: string,"usuario_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "cajas_gym_id_fkey"
      columns: ["gym_id"]
isOneToOne: false
      referencedRelation: "gyms"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cajas_usuario_id_fkey"
      columns: ["usuario_id"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    }
                  ]
                },"gyms": {
                  Row: {
                    "created_at": string,"dias_gracia": number,"dias_inactividad": number,"direccion": string,"email": string,"id": string,"localidad": string,"logo_url": string | null,"nombre": string,"qr_activo": boolean,"qr_token": string,"telefono": string,"venc_dia": number,"venc_dias": number,"venc_tipo": string,"zona_horaria": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"dias_gracia"?: number,"dias_inactividad"?: number,"direccion"?: string,"email"?: string,"id"?: string,"localidad"?: string,"logo_url"?: string | null,"nombre": string,"qr_activo"?: boolean,"qr_token"?: string,"telefono"?: string,"venc_dia"?: number,"venc_dias"?: number,"venc_tipo"?: string,"zona_horaria"?: string
                  }
                  Update: {
                    "created_at"?: string,"dias_gracia"?: number,"dias_inactividad"?: number,"direccion"?: string,"email"?: string,"id"?: string,"localidad"?: string,"logo_url"?: string | null,"nombre"?: string,"qr_activo"?: boolean,"qr_token"?: string,"telefono"?: string,"venc_dia"?: number,"venc_dias"?: number,"venc_tipo"?: string,"zona_horaria"?: string
                  }
                  Relationships: [
                    
                  ]
                },"movimientos": {
                  Row: {
                    "anulado_at": string | null,"anulado_por": string | null,"caja_id": string | null,"categoria": string,"descripcion": string,"fecha": string,"gym_id": string,"id": string,"medio": string,"monto": number,"motivo_anulacion": string | null,"tipo": string,"usuario_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "anulado_at"?: string | null,"anulado_por"?: string | null,"caja_id"?: string | null,"categoria": string,"descripcion": string,"fecha"?: string,"gym_id": string,"id"?: string,"medio": string,"monto": number,"motivo_anulacion"?: string | null,"tipo": string,"usuario_id": string
                  }
                  Update: {
                    "anulado_at"?: string | null,"anulado_por"?: string | null,"caja_id"?: string | null,"categoria"?: string,"descripcion"?: string,"fecha"?: string,"gym_id"?: string,"id"?: string,"medio"?: string,"monto"?: number,"motivo_anulacion"?: string | null,"tipo"?: string,"usuario_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "movimientos_anulado_por_fkey"
      columns: ["anulado_por"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "movimientos_caja_id_fkey"
      columns: ["caja_id"]
isOneToOne: false
      referencedRelation: "cajas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "movimientos_gym_id_fkey"
      columns: ["gym_id"]
isOneToOne: false
      referencedRelation: "gyms"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "movimientos_usuario_id_fkey"
      columns: ["usuario_id"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    }
                  ]
                },"movimientos_stock": {
                  Row: {
                    "cantidad": number,"fecha": string,"gym_id": string,"id": string,"movimiento_id": string | null,"nota": string,"producto_id": string,"tipo": string,"usuario_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cantidad": number,"fecha"?: string,"gym_id": string,"id"?: string,"movimiento_id"?: string | null,"nota"?: string,"producto_id": string,"tipo": string,"usuario_id": string
                  }
                  Update: {
                    "cantidad"?: number,"fecha"?: string,"gym_id"?: string,"id"?: string,"movimiento_id"?: string | null,"nota"?: string,"producto_id"?: string,"tipo"?: string,"usuario_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "movimientos_stock_gym_id_fkey"
      columns: ["gym_id"]
isOneToOne: false
      referencedRelation: "gyms"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "movimientos_stock_movimiento_id_fkey"
      columns: ["movimiento_id"]
isOneToOne: false
      referencedRelation: "movimientos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "movimientos_stock_producto_id_fkey"
      columns: ["producto_id"]
isOneToOne: false
      referencedRelation: "productos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "movimientos_stock_usuario_id_fkey"
      columns: ["usuario_id"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    }
                  ]
                },"pagos": {
                  Row: {
                    "activo_anterior": boolean | null,"clases_anterior": number | null,"fecha": string,"gym_id": string,"id": string,"medio": string,"monto": number,"movimiento_id": string,"plan_anterior": string | null,"plan_id": string,"snapshot": boolean,"socio_id": string,"usuario_id": string,"vencimiento_anterior": string | null,"vencimiento_hasta": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "activo_anterior"?: boolean | null,"clases_anterior"?: number | null,"fecha"?: string,"gym_id": string,"id"?: string,"medio": string,"monto": number,"movimiento_id": string,"plan_anterior"?: string | null,"plan_id": string,"snapshot"?: boolean,"socio_id": string,"usuario_id": string,"vencimiento_anterior"?: string | null,"vencimiento_hasta"?: string | null
                  }
                  Update: {
                    "activo_anterior"?: boolean | null,"clases_anterior"?: number | null,"fecha"?: string,"gym_id"?: string,"id"?: string,"medio"?: string,"monto"?: number,"movimiento_id"?: string,"plan_anterior"?: string | null,"plan_id"?: string,"snapshot"?: boolean,"socio_id"?: string,"usuario_id"?: string,"vencimiento_anterior"?: string | null,"vencimiento_hasta"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "pagos_gym_id_fkey"
      columns: ["gym_id"]
isOneToOne: false
      referencedRelation: "gyms"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pagos_movimiento_id_fkey"
      columns: ["movimiento_id"]
isOneToOne: false
      referencedRelation: "movimientos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pagos_plan_anterior_fkey"
      columns: ["plan_anterior"]
isOneToOne: false
      referencedRelation: "planes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pagos_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "planes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pagos_socio_id_fkey"
      columns: ["socio_id"]
isOneToOne: false
      referencedRelation: "socios"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pagos_usuario_id_fkey"
      columns: ["usuario_id"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    }
                  ]
                },"perfiles": {
                  Row: {
                    "activo": boolean,"apellido": string,"created_at": string,"email": string,"gym_id": string,"id": string,"invitacion_pendiente": boolean,"nombre": string,"rol": string,"ultimo_acceso": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "activo"?: boolean,"apellido"?: string,"created_at"?: string,"email": string,"gym_id": string,"id": string,"invitacion_pendiente"?: boolean,"nombre": string,"rol": string,"ultimo_acceso"?: string | null
                  }
                  Update: {
                    "activo"?: boolean,"apellido"?: string,"created_at"?: string,"email"?: string,"gym_id"?: string,"id"?: string,"invitacion_pendiente"?: boolean,"nombre"?: string,"rol"?: string,"ultimo_acceso"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "perfiles_gym_id_fkey"
      columns: ["gym_id"]
isOneToOne: false
      referencedRelation: "gyms"
      referencedColumns: ["id"]
    }
                  ]
                },"planes": {
                  Row: {
                    "activo": boolean,"cantidad_clases": number | null,"created_at": string,"duracion_dias": number | null,"gym_id": string,"id": string,"nombre": string,"precio": number,"tipo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activo"?: boolean,"cantidad_clases"?: number | null,"created_at"?: string,"duracion_dias"?: number | null,"gym_id": string,"id"?: string,"nombre": string,"precio": number,"tipo": string
                  }
                  Update: {
                    "activo"?: boolean,"cantidad_clases"?: number | null,"created_at"?: string,"duracion_dias"?: number | null,"gym_id"?: string,"id"?: string,"nombre"?: string,"precio"?: number,"tipo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "planes_gym_id_fkey"
      columns: ["gym_id"]
isOneToOne: false
      referencedRelation: "gyms"
      referencedColumns: ["id"]
    }
                  ]
                },"plataforma_admins": {
                  Row: {
                    "created_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"productos": {
                  Row: {
                    "activo": boolean,"categoria": string,"costo": number,"created_at": string,"gym_id": string,"id": string,"nombre": string,"precio": number,"stock": number,"stock_minimo": number
                  }
                  ComputedFields: never
                  Insert: {
                    "activo"?: boolean,"categoria": string,"costo"?: number,"created_at"?: string,"gym_id": string,"id"?: string,"nombre": string,"precio": number,"stock"?: number,"stock_minimo"?: number
                  }
                  Update: {
                    "activo"?: boolean,"categoria"?: string,"costo"?: number,"created_at"?: string,"gym_id"?: string,"id"?: string,"nombre"?: string,"precio"?: number,"stock"?: number,"stock_minimo"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "productos_gym_id_fkey"
      columns: ["gym_id"]
isOneToOne: false
      referencedRelation: "gyms"
      referencedColumns: ["id"]
    }
                  ]
                },"qr_intentos_fallidos": {
                  Row: {
                    "fecha": string,"gym_id": string,"id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "fecha"?: string,"gym_id": string,"id"?: never
                  }
                  Update: {
                    "fecha"?: string,"gym_id"?: string,"id"?: never
                  }
                  Relationships: [
                    {
      foreignKeyName: "qr_intentos_fallidos_gym_id_fkey"
      columns: ["gym_id"]
isOneToOne: false
      referencedRelation: "gyms"
      referencedColumns: ["id"]
    }
                  ]
                },"rutina_dias": {
                  Row: {
                    "gym_id": string,"id": string,"nombre": string,"orden": number,"rutina_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "gym_id": string,"id"?: string,"nombre": string,"orden": number,"rutina_id": string
                  }
                  Update: {
                    "gym_id"?: string,"id"?: string,"nombre"?: string,"orden"?: number,"rutina_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "rutina_dias_gym_id_fkey"
      columns: ["gym_id"]
isOneToOne: false
      referencedRelation: "gyms"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "rutina_dias_rutina_id_fkey"
      columns: ["rutina_id"]
isOneToOne: false
      referencedRelation: "rutinas"
      referencedColumns: ["id"]
    }
                  ]
                },"rutina_ejercicios": {
                  Row: {
                    "descanso": string,"dia_id": string,"gym_id": string,"id": string,"nombre": string,"nota": string,"orden": number,"repeticiones": string,"series": string
                  }
                  ComputedFields: never
                  Insert: {
                    "descanso"?: string,"dia_id": string,"gym_id": string,"id"?: string,"nombre": string,"nota"?: string,"orden": number,"repeticiones"?: string,"series"?: string
                  }
                  Update: {
                    "descanso"?: string,"dia_id"?: string,"gym_id"?: string,"id"?: string,"nombre"?: string,"nota"?: string,"orden"?: number,"repeticiones"?: string,"series"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "rutina_ejercicios_dia_id_fkey"
      columns: ["dia_id"]
isOneToOne: false
      referencedRelation: "rutina_dias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "rutina_ejercicios_gym_id_fkey"
      columns: ["gym_id"]
isOneToOne: false
      referencedRelation: "gyms"
      referencedColumns: ["id"]
    }
                  ]
                },"rutinas": {
                  Row: {
                    "activo": boolean,"created_at": string,"descripcion": string,"gym_id": string,"id": string,"nombre": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activo"?: boolean,"created_at"?: string,"descripcion"?: string,"gym_id": string,"id"?: string,"nombre": string,"updated_at"?: string
                  }
                  Update: {
                    "activo"?: boolean,"created_at"?: string,"descripcion"?: string,"gym_id"?: string,"id"?: string,"nombre"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "rutinas_gym_id_fkey"
      columns: ["gym_id"]
isOneToOne: false
      referencedRelation: "gyms"
      referencedColumns: ["id"]
    }
                  ]
                },"socio_dispositivos": {
                  Row: {
                    "created_at": string,"gym_id": string,"socio_id": string,"token": string,"ultimo_uso": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"gym_id": string,"socio_id": string,"token"?: string,"ultimo_uso"?: string
                  }
                  Update: {
                    "created_at"?: string,"gym_id"?: string,"socio_id"?: string,"token"?: string,"ultimo_uso"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "socio_dispositivos_gym_id_fkey"
      columns: ["gym_id"]
isOneToOne: false
      referencedRelation: "gyms"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "socio_dispositivos_socio_id_fkey"
      columns: ["socio_id"]
isOneToOne: false
      referencedRelation: "socios"
      referencedColumns: ["id"]
    }
                  ]
                },"socio_pins": {
                  Row: {
                    "bloqueado_hasta": string | null,"bloqueos": number,"gym_id": string,"intentos": number,"pin_hash": string,"socio_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bloqueado_hasta"?: string | null,"bloqueos"?: number,"gym_id": string,"intentos"?: number,"pin_hash": string,"socio_id": string,"updated_at"?: string
                  }
                  Update: {
                    "bloqueado_hasta"?: string | null,"bloqueos"?: number,"gym_id"?: string,"intentos"?: number,"pin_hash"?: string,"socio_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "socio_pins_gym_id_fkey"
      columns: ["gym_id"]
isOneToOne: false
      referencedRelation: "gyms"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "socio_pins_socio_id_fkey"
      columns: ["socio_id"]
isOneToOne: true
      referencedRelation: "socios"
      referencedColumns: ["id"]
    }
                  ]
                },"socio_rutinas": {
                  Row: {
                    "asignada_en": string,"asignada_por": string | null,"gym_id": string,"id": string,"rutina_id": string,"socio_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "asignada_en"?: string,"asignada_por"?: string | null,"gym_id": string,"id"?: string,"rutina_id": string,"socio_id": string
                  }
                  Update: {
                    "asignada_en"?: string,"asignada_por"?: string | null,"gym_id"?: string,"id"?: string,"rutina_id"?: string,"socio_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "socio_rutinas_asignada_por_fkey"
      columns: ["asignada_por"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "socio_rutinas_gym_id_fkey"
      columns: ["gym_id"]
isOneToOne: false
      referencedRelation: "gyms"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "socio_rutinas_rutina_id_fkey"
      columns: ["rutina_id"]
isOneToOne: false
      referencedRelation: "rutinas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "socio_rutinas_socio_id_fkey"
      columns: ["socio_id"]
isOneToOne: false
      referencedRelation: "socios"
      referencedColumns: ["id"]
    }
                  ]
                },"socios": {
                  Row: {
                    "activo": boolean,"apellido": string,"clases_restantes": number | null,"created_at": string,"dni": string,"email": string,"fecha_alta": string,"gym_id": string,"id": string,"nombre": string,"observaciones": string,"plan_id": string | null,"telefono": string,"ultima_asistencia": string | null,"vencimiento": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "activo"?: boolean,"apellido": string,"clases_restantes"?: number | null,"created_at"?: string,"dni": string,"email"?: string,"fecha_alta"?: string,"gym_id": string,"id"?: string,"nombre": string,"observaciones"?: string,"plan_id"?: string | null,"telefono"?: string,"ultima_asistencia"?: string | null,"vencimiento"?: string | null
                  }
                  Update: {
                    "activo"?: boolean,"apellido"?: string,"clases_restantes"?: number | null,"created_at"?: string,"dni"?: string,"email"?: string,"fecha_alta"?: string,"gym_id"?: string,"id"?: string,"nombre"?: string,"observaciones"?: string,"plan_id"?: string | null,"telefono"?: string,"ultima_asistencia"?: string | null,"vencimiento"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "socios_gym_id_fkey"
      columns: ["gym_id"]
isOneToOne: false
      referencedRelation: "gyms"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "socios_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "planes"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "_caja_abierta":
{ Args: { "p_usuario": string }; Returns: string
                           },
"_qr_perfil":
{ Args: { "p_socio": string }; Returns: Json
                           },
"_qr_registrar":
{ Args: { "p_dispositivo": string,"p_gym": Omit<Database["public"]['Tables']["gyms"]['Row'], Database["public"]['Tables']["gyms"]['ComputedFields']>,"p_socio": string }; Returns: Json
                           },
"_qr_socio":
{ Args: { "p_dispositivo": string,"p_token": string }; Returns: {
              "error": string,"gym_id": string,"socio_id": string
            }[]
                           },
"_yo":
{ Args: Record<PropertyKey, never>; Returns: {
              "activo": boolean,
"apellido": string,
"created_at": string,
"email": string,
"gym_id": string,
"id": string,
"invitacion_pendiente": boolean,
"nombre": string,
"rol": string,
"ultimo_acceso": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "perfiles"
        isOneToOne: true
        isSetofReturn: false
      } },
"abrir_caja":
{ Args: { "p_monto_inicial": number,"p_observaciones"?: string }; Returns: string
                           },
"agregar_empleado_admin":
{ Args: { "p_apellido"?: string,"p_email": string,"p_gym": string,"p_nombre": string,"p_rol"?: string }; Returns: undefined
                           },
"ajustar_stock":
{ Args: { "p_cantidad": number,"p_nota": string,"p_producto": string,"p_tipo": string }; Returns: number
                           },
"anular_movimiento":
{ Args: { "p_motivo": string,"p_movimiento": string }; Returns: undefined
                           },
"archivar_rutina":
{ Args: { "p_activo": boolean,"p_rutina": string }; Returns: undefined
                           },
"asignar_rutina":
{ Args: { "p_rutina": string,"p_socio": string }; Returns: undefined
                           },
"asistencias_dia_hora":
{ Args: { "p_desde": string }; Returns: {
              "cantidad": number,"dow": number,"hora": number
            }[]
                           },
"calcular_vencimiento":
{ Args: { "p_actual": string,"p_duracion": number,"p_hoy": string,"p_tipo": string,"p_venc_dia": number,"p_venc_dias": number,"p_venc_tipo": string }; Returns: string
                           },
"cerrar_caja":
{ Args: { "p_caja": string,"p_monto_contado": number,"p_observaciones"?: string }; Returns: number
                           },
"cobrar":
{ Args: { "p_medio": string,"p_monto": number,"p_plan": string,"p_socio": string }; Returns: Json
                           },
"crear_gimnasio_admin":
{ Args: { "p_apellido"?: string,"p_direccion"?: string,"p_email": string,"p_email_gym"?: string,"p_localidad"?: string,"p_nombre": string,"p_nombre_gym": string,"p_telefono"?: string }; Returns: string
                           },
"duplicar_rutina":
{ Args: { "p_rutina": string }; Returns: string
                           },
"es_dueno":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"es_superadmin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"guardar_rutina":
{ Args: { "p_rutina": Json }; Returns: string
                           },
"mi_gym":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"mi_rol":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"movimientos_por_dia":
{ Args: { "p_desde": string,"p_hasta"?: string }; Returns: {
              "dia": string,"egresos": number,"ingresos": number
            }[]
                           },
"qr_desvincular":
{ Args: { "p_dispositivo": string }; Returns: undefined
                           },
"qr_gimnasio":
{ Args: { "p_token": string }; Returns: {
              "activo": boolean,"id": string,"nombre": string
            }[]
                           },
"qr_ingresar":
{ Args: { "p_dispositivo": string,"p_token": string }; Returns: Json
                           },
"qr_perfil":
{ Args: { "p_dispositivo": string,"p_pin": string,"p_token": string }; Returns: Json
                           },
"qr_perfil_estado":
{ Args: { "p_dispositivo": string,"p_token": string }; Returns: Json
                           },
"qr_pin_crear":
{ Args: { "p_dispositivo": string,"p_pin": string,"p_token": string }; Returns: Json
                           },
"qr_regenerar":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"qr_vincular":
{ Args: { "p_dni": string,"p_token": string }; Returns: Json
                           },
"quitar_rutina":
{ Args: { "p_rutina": string,"p_socio": string }; Returns: undefined
                           },
"registrar_acceso":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"registrar_asistencia":
{ Args: { "p_socio": string }; Returns: string
                           },
"registrar_movimiento":
{ Args: { "p_categoria": string,"p_descripcion": string,"p_medio": string,"p_monto": number,"p_sin_caja"?: boolean,"p_tipo": string }; Returns: string
                           },
"resumen_movimientos":
{ Args: { "p_desde": string,"p_hasta"?: string }; Returns: {
              "categoria": string,"medio": string,"tipo": string,"total": number
            }[]
                           },
"socio_restablecer_pin":
{ Args: { "p_socio": string }; Returns: undefined
                           },
"socio_tiene_pin":
{ Args: { "p_socio": string }; Returns: boolean
                           },
"vender":
{ Args: { "p_items": Json,"p_medio": string }; Returns: string
                           },
"ventas_por_producto":
{ Args: { "p_desde": string }; Returns: {
              "producto_id": string,"unidades": number
            }[]
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
