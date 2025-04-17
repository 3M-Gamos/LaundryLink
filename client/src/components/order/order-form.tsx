import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertOrderSchema, LaundryItem, OrderStatus, orderItemSchema, type OrderItem } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Plus, Minus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AdminMap from "@/components/admin/admin-map";
import AddressMap from "@/components/order/address-map";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { fr } from "date-fns/locale";

export default function OrderForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const form = useForm({
    resolver: zodResolver(insertOrderSchema),
    defaultValues: {
      items: [],
      pickupAddress: "",
      deliveryAddress: "",
      pickupTime: new Date().toISOString(),
      deliveryTime: new Date().toISOString(),
      price: 0,
      businessId: undefined,
      status: OrderStatus.PENDING, // "En attente"
    },
  });

  const { data: businesses, isLoading: isLoadingBusinesses } = useQuery({
    queryKey: ["/api/businesses"],
  });

  const createOrder = useMutation({
    mutationFn: async (data: z.infer<typeof insertOrderSchema>) => {
      console.log("Envoi des données de commande:", data);
      const res = await apiRequest("POST", "/api/orders", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Commande créée",
        description: "Votre commande a été créée avec succès",
      });
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Fonction pour calculer le prix total
  const calculateTotalPrice = (items: OrderItem[]) => {
    return items.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const onSubmit = (values: z.infer<typeof insertOrderSchema>) => {
    // Vérifier que l'utilisateur est connecté
    if (!user) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté pour créer une commande",
        variant: "destructive",
      });
      return;
    }
    
    // Créer une copie des données sans customerId (sera ajouté côté serveur)
    const orderData = {
      businessId: values.businessId,
      status: OrderStatus.PENDING,
      items: JSON.parse(JSON.stringify(values.items)),
      pickupAddress: values.pickupAddress,
      deliveryAddress: values.deliveryAddress,
      pickupTime: values.pickupTime,
      deliveryTime: values.deliveryTime,
      price: calculateTotalPrice(values.items as OrderItem[])
    };
    
    console.log("===== ENVOI DE COMMANDE DEPUIS FORMULAIRE =====\n", orderData);
    
    // Vérifier si les items sont au bon format
    const items = orderData.items as OrderItem[];
    if (!items || items.length === 0) {
      console.error("Aucun item dans la commande!");
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner au moins un article",
        variant: "destructive",
      });
      return;
    }
    
    if (!orderData.businessId) {
      console.error("Aucun pressing sélectionné!");
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un pressing sur la carte",
        variant: "destructive",
      });
      return;
    }
    
    if (!orderData.pickupAddress || !orderData.deliveryAddress) {
      console.error("Adresses manquantes!");
      toast({
        title: "Erreur",
        description: "Veuillez remplir les adresses de ramassage et de livraison",
        variant: "destructive",
      });
      return;
    }
    
    try {
      createOrder.mutate(orderData);
    } catch (error) {
      console.error("Erreur lors de la création de la commande:", error);
    }
  };

  const handleBusinessSelect = (businessId: number) => {
    console.log("Pressing sélectionné:", businessId);
    form.setValue("businessId", businessId);
  };

  const selectedBusiness = businesses?.find(
    (b) => b.id === form.getValues().businessId
  );

  const items = form.watch("items") as OrderItem[];

  // Assurez-vous que l'objet item est en majuscules comme requis par le schéma
  const handleAddItem = (item: keyof typeof LaundryItem) => {
    console.log("Adding item:", item, "(type:", typeof item, ")");
    const currentItems = form.getValues("items") as OrderItem[];
    const existingItem = currentItems.find((i) => i.item === item);
    let updatedItems: OrderItem[];

    if (existingItem) {
      updatedItems = currentItems.map((i) =>
        i.item === item ? { ...i, quantity: i.quantity + 1 } : i
      );
    } else {
      // Créer un nouvel élément avec la clé en majuscules
      const newItem: OrderItem = { 
        item: item, // item est déjà une clé (c'est-à-dire en majuscules)
        quantity: 1, 
        price: 1000 
      };
      
      console.log("Nouvel article ajouté:", newItem);
      updatedItems = [...currentItems, newItem];
    }
    
    form.setValue("items", updatedItems);
    // Mettre à jour le prix total
    form.setValue("price", calculateTotalPrice(updatedItems));
  };

  const handleRemoveItem = (item: keyof typeof LaundryItem) => {
    console.log("Removing item:", item);
    const currentItems = form.getValues("items") as OrderItem[];
    const existingItem = currentItems.find((i) => i.item === item);
    let updatedItems: OrderItem[];

    if (existingItem && existingItem.quantity > 1) {
      updatedItems = currentItems.map((i) =>
        i.item === item ? { ...i, quantity: i.quantity - 1 } : i
      );
    } else {
      updatedItems = currentItems.filter((i) => i.item !== item);
    }
    
    form.setValue("items", updatedItems);
    // Mettre à jour le prix total
    form.setValue("price", calculateTotalPrice(updatedItems));
  };

  if (isLoadingBusinesses) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Créer une nouvelle commande</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Gestionnaire de changement d'adresse de ramassage
  const handlePickupAddressChange = (address: string, coordinates: [number, number]) => {
    console.log("Nouvelle adresse de ramassage:", address, coordinates);
    form.setValue("pickupAddress", address);
    
    // Si vous souhaitez également stocker les coordonnées, vous pouvez le faire dans un état local
    // ou ajouter un nouveau champ au formulaire
  };

  // Gestionnaire de changement d'adresse de livraison
  const handleDeliveryAddressChange = (address: string, coordinates: [number, number]) => {
    console.log("Nouvelle adresse de livraison:", address, coordinates);
    form.setValue("deliveryAddress", address);
  };

  return (
    <div className="space-y-8">
      <AdminMap 
        businesses={businesses || []}
        onSelectBusiness={handleBusinessSelect}
      />
      
      {/* Carte pour sélectionner les adresses */}
      <AddressMap
        pickupAddress={form.getValues().pickupAddress}
        deliveryAddress={form.getValues().deliveryAddress}
        onPickupAddressChange={handlePickupAddressChange}
        onDeliveryAddressChange={handleDeliveryAddressChange}
      />

      <Card>
        <CardHeader>
          <CardTitle>Créer une nouvelle commande</CardTitle>
          {selectedBusiness && (
            <div className="text-sm text-muted-foreground">
              Pressing sélectionné: {selectedBusiness.name}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={e => {
              // Prévenir la soumission par défaut
              e.preventDefault();
              // Notre handler personnalisé sera appelé par le bouton
            }} className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-medium">Articles</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(LaundryItem).map(([key, label]) => {
                    const itemCount = items.find((i) => i.item === key)?.quantity ?? 0;
                    return (
                      <Card key={key}>
                        <CardContent className="pt-6">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{label}</span>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleRemoveItem(key as keyof typeof LaundryItem)}
                                disabled={itemCount === 0}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="w-8 text-center">{itemCount}</span>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleAddItem(key as keyof typeof LaundryItem)}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="pickupTime"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date et heure de ramassage</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(new Date(field.value), "PPP", {
                                  locale: fr,
                                })
                              ) : (
                                <span>Choisir une date</span>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={new Date(field.value)}
                            onSelect={(date) =>
                              field.onChange(date?.toISOString())
                            }
                            disabled={(date) =>
                              date < new Date()
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="deliveryTime"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date et heure de livraison</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(new Date(field.value), "PPP", {
                                  locale: fr,
                                })
                              ) : (
                                <span>Choisir une date</span>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={new Date(field.value)}
                            onSelect={(date) =>
                              field.onChange(date?.toISOString())
                            }
                            disabled={(date) =>
                              date < new Date(form.getValues().pickupTime)
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Champs d'adresse en lecture seule */}
              <FormField
                control={form.control}
                name="pickupAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse de ramassage</FormLabel>
                    <FormControl>
                      <Input {...field} readOnly className="bg-muted" />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">Sélectionnez l'adresse sur la carte ci-dessus</p>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="deliveryAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse de livraison</FormLabel>
                    <FormControl>
                      <Input {...field} readOnly className="bg-muted" />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">Sélectionnez l'adresse sur la carte ci-dessus</p>
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <Button 
                  type="button" 
                  disabled={
                    createOrder.isPending || 
                    !form.getValues().businessId || 
                    (form.getValues().items as OrderItem[]).length === 0
                  }
                  onClick={() => onSubmit(form.getValues())}
                >
                  {createOrder.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Créer la commande
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}