package com.vibeshelf.vibeshelf_backend.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BulkBookRequest {
    
    @NotNull(message = "Book IDs list cannot be null")
    @Size(min = 1, max = 100, message = "Book IDs list must contain between 1 and 100 items")
    private List<Long> bookIds;
}