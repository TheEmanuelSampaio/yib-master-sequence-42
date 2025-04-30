import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { User } from "@/types";

export default function Settings() {
  const {
    user,
    users,
    clients,
    addUser,
    updateUser,
    deleteUser,
    addClient,
    updateClient,
    deleteClient,
    addTag,
    deleteTag,
    addTimeRestriction,
    updateTimeRestriction,
    deleteTimeRestriction,
  } = useApp();

  const [accountName, setAccountName] = useState(user?.accountName || "");
  const [email, setEmail] = useState(user?.email || "");
  // Remove password from state since it's not part of the User type
  const [accountNameClient, setAccountNameClient] = useState("");
  const [accountIdClient, setAccountIdClient] = useState<number>(0);
  const [tag, setTag] = useState("");

  const handleUpdateProfile = () => {
    if (!user) return;

    updateUser(user.id, {
      accountName,
      email,
      role: user.role,
      // avatar is optional
      avatar: user.avatar,
    });

    toast.success("Perfil atualizado com sucesso!");
  };

  const handleAddUser = () => {
    // Since password isn't part of the User type, we shouldn't pass it to addUser
    // Instead, we should use a separate process for user creation if needed
    addUser({
      email,
      accountName,
      role: "admin", // Default role
    });
    
    toast.success("Usuário adicionado com sucesso!");
  };

  const handleAddClient = () => {
    if (!accountNameClient || !accountIdClient) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (!user) return;
    
    addClient({
      accountName: accountNameClient,
      accountId: accountIdClient,
      createdBy: user.id,
    });
    
    setAccountNameClient("");
    setAccountIdClient(0);
    
    toast.success("Cliente adicionado com sucesso!");
  };

  const handleDeleteUser = (id: string) => {
    deleteUser(id);
    toast.success("Usuário excluído com sucesso!");
  };

  const handleAddTag = () => {
    addTag(tag);
    setTag("");
    toast.success("Tag adicionada com sucesso!");
  };

  const handleDeleteTag = (tagToDelete: string) => {
    deleteTag(tagToDelete);
    toast.success("Tag excluída com sucesso!");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie as configurações da sua conta e equipe.
        </p>
      </div>
      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="team">Equipe</TabsTrigger>
          <TabsTrigger value="clients">Clientes</TabsTrigger>
          <TabsTrigger value="tags">Tags</TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Perfil</CardTitle>
              <CardDescription>
                Atualize as informações associadas à sua conta.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="space-y-1">
                <Label htmlFor="accountName">Nome da Conta</Label>
                <Input
                  id="accountName"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleUpdateProfile}>Atualizar Perfil</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gerenciar Equipe</CardTitle>
              <CardDescription>
                Adicione ou remova membros da sua equipe.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between"
                >
                  <div>{user.accountName}</div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteUser(user.id)}
                  >
                    Remover
                  </Button>
                </div>
              ))}
              <div className="space-y-1">
                <Label htmlFor="newEmail">Novo Email</Label>
                <Input
                  id="newEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="newAccountName">Nome da Conta</Label>
                <Input
                  id="newAccountName"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleAddUser}>Adicionar Usuário</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="clients" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gerenciar Clientes</CardTitle>
              <CardDescription>
                Adicione ou remova clientes da sua conta.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {clients.map((client) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between"
                >
                  <div>{client.accountName}</div>
                  <Button variant="destructive" size="sm" onClick={() => deleteClient(client.id)}>
                    Remover
                  </Button>
                </div>
              ))}
              <div className="space-y-1">
                <Label htmlFor="newAccountNameClient">Nome do Cliente</Label>
                <Input
                  id="newAccountNameClient"
                  value={accountNameClient}
                  onChange={(e) => setAccountNameClient(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="newAccountIdClient">ID do Cliente</Label>
                <Input
                  id="newAccountIdClient"
                  type="number"
                  value={accountIdClient.toString()}
                  onChange={(e) => setAccountIdClient(Number(e.target.value))}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleAddClient}>Adicionar Cliente</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="tags" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gerenciar Tags</CardTitle>
              <CardDescription>
                Adicione ou remova tags da sua conta.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {/* Display existing tags */}
              {Array.isArray(useApp().tags) && useApp().tags.map((existingTag) => (
                <div
                  key={existingTag}
                  className="flex items-center justify-between"
                >
                  <div>{existingTag}</div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteTag(existingTag)}
                  >
                    Remover
                  </Button>
                </div>
              ))}
              <div className="space-y-1">
                <Label htmlFor="newTag">Nova Tag</Label>
                <Input
                  id="newTag"
                  type="text"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleAddTag}>Adicionar Tag</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
