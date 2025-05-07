import React, { useState, useEffect } from "react";
import { useApp } from '@/context/AppContext';

export default function Contacts() {
  const { contacts, deleteContact, updateContact, removeFromSequence, updateContactSequence } = useApp();
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Contatos</h1>
      <p className="text-muted-foreground">
        Esta página está em desenvolvimento. Volte em breve.
      </p>
    </div>
  );
}
