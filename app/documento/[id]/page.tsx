import Editor from "@/components/Editor";
import { createClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import type { DocumentModel } from "@/types/document";

export default async function DocumentoPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data: row } = await supabase
    .from("documents")
    .select("*")
    .eq("id", params.id)
    .single();
  if (!row) notFound();

  const doc: DocumentModel = {
    id: row.id,
    doc_type: row.doc_type,
    orientation: row.orientation,
    meta: row.data?.meta || { title: row.title },
    logos_primary: row.data?.logos_primary || [],
    logos_secondary: row.data?.logos_secondary || [],
    sections: row.data?.sections || [],
  };

  return <Editor initialDoc={doc} />;
}
