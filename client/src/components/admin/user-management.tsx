import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, UserRole } from "@shared/schema";
import { z } from "zod";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Schéma pour la création d'utilisateurs par l'admin
const adminUserSchema = insertUserSchema.extend({
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

export default function UserManagement() {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof adminUserSchema>>({
    resolver: zodResolver(adminUserSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      role: UserRole.DELIVERY, // Par défaut, nous créons des livreurs
      name: "",
      phone: "",
      address: "",
    },
  });

  // Récupérer la liste des utilisateurs pour l'affichage
  const { data: deliveryUsers, isLoading: isLoadingDelivery } = useQuery({
    queryKey: ["/api/users/delivery"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/users?role=delivery");
        return res.json();
      } catch (error) {
        console.error("Erreur lors de la récupération des livreurs:", error);
        return [];
      }
    }
  });

  const { data: adminUsers, isLoading: isLoadingAdmin } = useQuery({
    queryKey: ["/api/users/admin"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/users?role=business");
        return res.json();
      } catch (error) {
        console.error("Erreur lors de la récupération des administrateurs:", error);
        return [];
      }
    }
  });

  const createUser = useMutation({
    mutationFn: async (data: z.infer<typeof adminUserSchema>) => {
      // Supprimer confirmPassword avant l'envoi
      const { confirmPassword, ...userData } = data;
      const res = await apiRequest("POST", "/api/admin/users", userData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/delivery"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/admin"] });
      toast({
        title: "Utilisateur créé",
        description: "L'utilisateur a été créé avec succès",
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

  const onSubmit = (values: z.infer<typeof adminUserSchema>) => {
    createUser.mutate(values);
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Créer un nouvel utilisateur</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom d'utilisateur</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mot de passe</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmer le mot de passe</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rôle</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex space-x-4"
                      >
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value={UserRole.DELIVERY} />
                          </FormControl>
                          <FormLabel className="font-normal">Livreur</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value={UserRole.BUSINESS} />
                          </FormControl>
                          <FormLabel className="font-normal">Administrateur</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom complet</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Téléphone</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={createUser.isPending}
              >
                {createUser.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Créer l'utilisateur
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Livreurs</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingDelivery ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : deliveryUsers && deliveryUsers.length > 0 ? (
              <ul className="space-y-2">
                {deliveryUsers.map((user) => (
                  <li key={user.id} className="p-2 border rounded">
                    <div className="font-medium">{user.name}</div>
                    <div className="text-sm text-muted-foreground">{user.username}</div>
                    <div className="text-sm">{user.phone}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">Aucun livreur trouvé</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Administrateurs</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingAdmin ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : adminUsers && adminUsers.length > 0 ? (
              <ul className="space-y-2">
                {adminUsers.map((user) => (
                  <li key={user.id} className="p-2 border rounded">
                    <div className="font-medium">{user.name}</div>
                    <div className="text-sm text-muted-foreground">{user.username}</div>
                    <div className="text-sm">{user.phone}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">Aucun administrateur trouvé</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
