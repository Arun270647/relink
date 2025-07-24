import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const AdminPage = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleBackfill = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('backfill-embeddings');
      if (error) throw error;
      toast({
        title: "Backfill Started",
        description: "The embedding backfill process has been started.",
      });
    } catch (error: any) {
      toast({
        title: "Backfill Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Admin Tools</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            Use these tools to manage the application data.
          </p>
          <Button onClick={handleBackfill} disabled={loading}>
            {loading ? "Processing..." : "Backfill Embeddings"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPage;