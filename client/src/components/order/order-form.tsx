import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertOrderSchema, LaundryItem, orderItemSchema, type OrderItem } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Plus, Minus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import BusinessMap from "@/components/business/business-map";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { fr } from "date-fns/locale";

export default function OrderForm() {
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
      status: "pending",
    },
  });

  const { data: businesses, isLoading: isLoadingBusinesses } = useQuery({
    queryKey: ["/api/businesses"],
  });

  const createOrder = useMutation({
    mutationFn: async (data: z.infer<typeof insertOrderSchema>) => {
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

  const onSubmit = (values: z.infer<typeof insertOrderSchema>) => {
    createOrder.mutate(values);
  };

  const handleBusinessSelect = (businessId: number) => {
    form.setValue("businessId", businessId);
  };

  const selectedBusiness = businesses?.find(
    (b) => b.id === form.getValues().businessId
  );

  const items = form.watch("items") as OrderItem[];

  const handleAddItem = (item: keyof typeof LaundryItem) => {
    const currentItems = form.getValues("items") as OrderItem[];
    const existingItem = currentItems.find((i) => i.item === item);

    if (existingItem) {
      const updatedItems = currentItems.map((i) =>
        i.item === item ? { ...i, quantity: i.quantity + 1 } : i
      );
      form.setValue("items", updatedItems);
    } else {
      form.setValue("items", [...currentItems, { item, quantity: 1, price: 1000 }]);
    }
  };

  const handleRemoveItem = (item: keyof typeof LaundryItem) => {
    const currentItems = form.getValues("items") as OrderItem[];
    const existingItem = currentItems.find((i) => i.item === item);

    if (existingItem && existingItem.quantity > 1) {
      const updatedItems = currentItems.map((i) =>
        i.item === item ? { ...i, quantity: i.quantity - 1 } : i
      );
      form.setValue("items", updatedItems);
    } else {
      form.setValue(
        "items",
        currentItems.filter((i) => i.item !== item)
      );
    }
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

  return (
    <div className="space-y-8">
      <BusinessMap 
        businesses={businesses || []}
        onSelectBusiness={handleBusinessSelect}
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-medium">Articles</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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

              <FormField
                control={form.control}
                name="pickupAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse de ramassage</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
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
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                disabled={
                  createOrder.isPending || 
                  !form.getValues().businessId || 
                  items.length === 0
                }
              >
                {createOrder.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Créer la commande
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}