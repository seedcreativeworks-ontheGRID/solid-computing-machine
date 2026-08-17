-- AddForeignKey
ALTER TABLE "Exception" ADD CONSTRAINT "Exception_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
