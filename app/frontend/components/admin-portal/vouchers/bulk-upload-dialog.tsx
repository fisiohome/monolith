import { router } from "@inertiajs/react";
import {
	AlertCircle,
	CheckCircle,
	Download,
	FileSpreadsheetIcon,
	Loader2,
	Upload,
	X,
} from "lucide-react";
import { useCallback, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
} from "@/components/ui/drawer";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { formatBytes, useFileUpload } from "@/hooks/use-file-upload";

type BulkUploadDialogProps = {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	uploadUrl: string;
	templateUrl: string;
};

export default function BulkUploadDialog({
	isOpen,
	onOpenChange,
	uploadUrl,
	templateUrl,
}: BulkUploadDialogProps) {
	const maxSize = 5 * 1024 * 1024; // 5MB

	const [isUploading, setIsUploading] = useState(false);
	const [uploadProgress, setUploadProgress] = useState(0);
	const [uploadStatus, setUploadStatus] = useState<
		"idle" | "success" | "error"
	>("idle");
	const [uploadMessage, setUploadMessage] = useState<string>("");
	const [uploadStep, setUploadStep] = useState<1 | 2>(1); // 1: file upload, 2: save to db
	const [uploadedFileData, setUploadedFileData] = useState<File | null>(null);
	const [previewData, setPreviewData] = useState<{
		created: number;
		errors: string[];
		rows?: Array<{
			rowNumber: number;
			code: string;
			name: string;
			discountType: string;
			discountValue: string;
			quota: string;
			status: "created" | "error";
			reason?: string;
		}>;
	} | null>(null);

	const [
		{ files, isDragging },
		{
			handleDragEnter,
			handleDragLeave,
			handleDragOver,
			handleDrop,
			openFileDialog,
			removeFile,
			getInputProps,
		},
	] = useFileUpload({
		maxSize,
		accept:
			".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	});

	const file = files[0];

	const handleUpload = useCallback(async () => {
		if (!file && !uploadedFileData) return;

		// For step 2 (save to DB), use the uploaded file data
		const fileToUse = uploadStep === 2 ? uploadedFileData : file?.file;

		if (!fileToUse || !(fileToUse instanceof File)) {
			setUploadStatus("error");
			setUploadMessage("Invalid file type. Please re-upload the file.");
			return;
		}

		setIsUploading(true);
		setUploadProgress(0);
		setUploadStatus("idle");
		setUploadMessage("");

		const formData = new FormData();
		formData.append("excel_file", fileToUse);
		// Send save_to_db=true for step 2 (actual save), false for step 1 (preview)
		formData.append("save_to_db", uploadStep === 2 ? "true" : "false");

		try {
			const xhr = new XMLHttpRequest();

			// Track progress
			xhr.upload.addEventListener("progress", (event) => {
				if (event.lengthComputable) {
					const progress = (event.loaded / event.total) * 100;
					setUploadProgress(progress);
				}
			});

			// Handle completion
			xhr.addEventListener("load", () => {
				setIsUploading(false);

				if (uploadStep === 1) {
					// Step 1: Show preview
					if (xhr.status === 200) {
						try {
							const response = JSON.parse(xhr.responseText);
							if (response.success) {
								setUploadStatus("success");
								setUploadMessage(
									"File uploaded successfully. Review the preview above, then click 'Save Vouchers' to save the data.",
								);

								// Store preview data
								setPreviewData({
									created:
										response.rows?.filter((r: any) => r.status === "created")
											.length || 0,
									errors: response.errors || [],
									rows: response.rows || [],
								});

								// Store file data for step 2
								setUploadedFileData(fileToUse);

								// Move to step 2
								setUploadStep(2);
							} else {
								setUploadStatus("error");
								setUploadMessage(response.message);
							}
						} catch {
							setUploadStatus("error");
							setUploadMessage("Invalid response from server");
						}
					} else {
						setUploadStatus("error");
						setUploadMessage("Failed to upload file. Please try again.");
					}
				} else {
					// Step 2: Save to database
					if (xhr.status === 200) {
						try {
							const response = JSON.parse(xhr.responseText);
							if (response.success) {
								setUploadStatus("success");
								setUploadMessage("Vouchers saved successfully!");
								// Close dialog and redirect after a short delay
								setTimeout(() => {
									onOpenChange(false);
								}, 250);
								setTimeout(() => {
									router.reload();
								}, 750);
							} else {
								setUploadStatus("error");
								setUploadMessage(
									response.message ||
										"Failed to save vouchers. Please try again.",
								);
							}
						} catch {
							setUploadStatus("error");
							setUploadMessage("Invalid response from server");
						}
					} else {
						setUploadStatus("error");
						setUploadMessage("Failed to save vouchers. Please try again.");
					}
				}
			});

			// Handle error
			xhr.addEventListener("error", () => {
				setIsUploading(false);
				setUploadStatus("error");
				setUploadMessage(
					"Operation failed. Please check your connection and try again.",
				);
			});

			// Open and send request
			xhr.open("POST", uploadUrl);
			xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
			// Add CSRF token
			const token = document
				.querySelector('meta[name="csrf-token"]')
				?.getAttribute("content");
			if (token) {
				xhr.setRequestHeader("X-CSRF-Token", token);
			}
			xhr.send(formData);
		} catch (error) {
			console.error("Upload error:", error);
			setIsUploading(false);
			setUploadStatus("error");
			setUploadMessage("An unexpected error occurred. Please try again.");
		}
	}, [file, uploadUrl, uploadStep, uploadedFileData, onOpenChange]);

	const downloadTemplate = useCallback(() => {
		// Download Excel template from server
		window.location.href = templateUrl;
	}, [templateUrl]);

	const handleRemoveFile = useCallback(() => {
		if (file?.id) {
			removeFile(file.id);
		}
		// Reset all states when file is removed
		setUploadStep(1);
		setUploadedFileData(null);
		setPreviewData(null);
		setUploadStatus("idle");
		setUploadMessage("");
	}, [removeFile, file?.id]);

	return (
		<Drawer open={isOpen} onOpenChange={onOpenChange}>
			<DrawerContent
				onInteractOutside={(event) => {
					event.preventDefault();
				}}
				className="flex flex-col rounded-t-[10px] mt-24 max-h-[90%] fixed bottom-0 left-0 right-0 outline-none"
			>
				<div className="flex-1 overflow-y-auto">
					<div className="w-full max-w-md mx-auto">
						<DrawerHeader>
							<DrawerTitle>Bulk Upload Vouchers</DrawerTitle>
							<DrawerDescription>
								Upload vouchers in bulk using Excel file
							</DrawerDescription>
						</DrawerHeader>

						<div className="p-4 space-y-6">
							{/* Download Template */}
							<div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
								<div className="flex items-center gap-3">
									<FileSpreadsheetIcon className="size-5 text-muted-foreground" />
									<div>
										<p className="font-medium">Excel Template</p>
										<p className="text-sm text-muted-foreground">
											Download the template with dropdowns for easier data entry
										</p>
									</div>
								</div>
								<Button variant="outline" onClick={downloadTemplate}>
									<Download className="size-4" />
									Download
								</Button>
							</div>

							{/* File Upload */}
							<div className="space-y-3">
								{/* Drop area */}
								<button
									type="button"
									className={`flex min-h-40 flex-col items-center justify-center rounded-xl border border-input border-dashed p-4 transition-colors w-full ${
										file
											? "opacity-50 cursor-not-allowed bg-muted/20"
											: "hover:bg-accent/50 has-disabled:pointer-events-none has-[input:focus]:border-ring has-disabled:opacity-50 has-[input:focus]:ring-[3px] has-[input:focus]:ring-ring/50 data-[dragging=true]:bg-accent/50"
									}`}
									data-dragging={!file && (isDragging || undefined)}
									onClick={!file ? openFileDialog : undefined}
									onDragEnter={!file ? handleDragEnter : undefined}
									onDragLeave={!file ? handleDragLeave : undefined}
									onDragOver={!file ? handleDragOver : undefined}
									onDrop={!file ? handleDrop : undefined}
								>
									<input
										{...getInputProps()}
										id="file-upload-input"
										aria-label="Upload file"
										className="sr-only"
										disabled={Boolean(file)}
									/>

									<div className="flex flex-col items-center justify-center text-center">
										<div
											aria-hidden="true"
											className="mb-2 flex size-11 shrink-0 items-center justify-center rounded-full border bg-background"
										>
											{file ? (
												<FileSpreadsheetIcon className="size-4 opacity-60" />
											) : (
												<Upload className="size-4 opacity-60" />
											)}
										</div>
										<p className="mb-1.5 font-medium text-sm">
											{file ? "File selected" : "Upload Excel file"}
										</p>
										<p className="text-muted-foreground text-xs">
											{file
												? "Remove the file below to select a new one"
												: "Drag & drop or click to browse (max. " +
													formatBytes(maxSize) +
													")"}
										</p>
									</div>
								</button>

								{/* File list */}
								{file && (
									<div className="space-y-2">
										<div className="flex items-center gap-2 p-3 border rounded-lg bg-background">
											<FileSpreadsheetIcon className="size-4 text-muted-foreground" />
											<span className="flex-1 text-sm truncate">
												{file.file.name}
											</span>
											<span className="text-xs text-muted-foreground">
												{formatBytes(file.file.size)}
											</span>
											<Button
												variant="ghost"
												size="icon"
												onClick={handleRemoveFile}
												disabled={isUploading}
											>
												<X className="size-4" />
											</Button>
										</div>

										{uploadStep === 1 && (
											<p className="text-xs text-muted-foreground">
												Click "Upload & Preview" to review your data before
												saving
											</p>
										)}

										{uploadStep === 2 && (
											<p className="text-xs text-green-600">
												✓ File uploaded and ready to save
											</p>
										)}
									</div>
								)}
							</div>

							{/* Upload Progress */}
							{isUploading && (
								<div className="space-y-2">
									<div className="flex items-center justify-between text-sm">
										<span>Uploading...</span>
										<span>{Math.round(uploadProgress)}%</span>
									</div>
									<Progress value={uploadProgress} />
								</div>
							)}

							{/* Test Results Table Preview */}
							{previewData?.rows?.length && previewData.rows.length > 0 && (
								<>
									<Separator />

									<div className="space-y-3">
										<div className="text-xs uppercase tracking-wider text-muted-foreground/75 font-medium">
											Upload Preview:
										</div>
										<div className="border rounded-lg overflow-hidden">
											<div className="max-h-64 overflow-y-auto">
												<table className="w-full text-sm">
													<thead className="bg-muted sticky top-0">
														<tr>
															<th className="px-3 py-2 text-left font-medium">
																Row
															</th>
															<th className="px-3 py-2 text-left font-medium">
																Code
															</th>
															<th className="px-3 py-2 text-left font-medium">
																Name
															</th>
															<th className="px-3 py-2 text-left font-medium">
																Type
															</th>
															<th className="px-3 py-2 text-left font-medium">
																Value
															</th>
															<th className="px-3 py-2 text-left font-medium">
																Quota
															</th>
															<th className="px-3 py-2 text-left font-medium">
																Status
															</th>
															<th className="px-3 py-2 text-left font-medium">
																Reason
															</th>
														</tr>
													</thead>
													<tbody>
														{previewData.rows.map((row) => (
															<tr
																key={row.rowNumber}
																className={`border-t ${
																	row.status === "created"
																		? "bg-green-50"
																		: "bg-red-50"
																}`}
															>
																<td className="px-3 py-2">{row.rowNumber}</td>
																<td className="px-3 py-2 font-mono text-xs">
																	{row.code}
																</td>
																<td className="px-3 py-2 truncate max-w-32">
																	{row.name}
																</td>
																<td className="px-3 py-2">
																	{row.discountType}
																</td>
																<td className="px-3 py-2">
																	{row.discountValue}
																</td>
																<td className="px-3 py-2">{row.quota}</td>
																<td className="px-3 py-2">
																	<span
																		className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
																			row.status === "created"
																				? "bg-green-100 text-green-800"
																				: "bg-red-100 text-red-800"
																		}`}
																	>
																		{row.status === "created" && (
																			<CheckCircle className="size-3" />
																		)}
																		{row.status === "error" && (
																			<AlertCircle className="size-3" />
																		)}
																		{row.status}
																	</span>
																</td>
																<td className="px-3 py-2 text-xs text-muted-foreground max-w-48 truncate">
																	{row.reason || "-"}
																</td>
															</tr>
														))}
													</tbody>
												</table>
											</div>
										</div>

										{/* Summary */}
										<div className="flex items-center justify-between text-sm p-3 px-0 bg-muted/30 rounded-lg">
											<div className="flex items-center gap-4">
												<span className="flex items-center gap-1">
													<div className="w-3 h-3 bg-green-100 rounded-full border border-green-300"></div>
													Valid:{" "}
													<span className="font-medium">
														{previewData.created}
													</span>
												</span>
												<span className="flex items-center gap-1">
													<div className="w-3 h-3 bg-red-100 rounded-full border border-red-300"></div>
													Errors:{" "}
													<span className="font-medium">
														{previewData.rows?.filter(
															(r) => r.status === "error",
														).length || 0}
													</span>
												</span>
											</div>
											<span className="text-muted-foreground">
												Total: {previewData.rows?.length || 0} rows
											</span>
										</div>
									</div>
								</>
							)}

							{/* Status Messages */}
							{uploadStatus !== "idle" && (
								<Alert
									variant={
										uploadStatus === "success"
											? "default"
											: uploadStatus === "error"
												? "destructive"
												: "default"
									}
								>
									{uploadStatus === "success" ? (
										<CheckCircle className="size-4 -mt-1" />
									) : (
										<AlertCircle className="size-4 -mt-1" />
									)}
									<AlertDescription>{uploadMessage}</AlertDescription>
								</Alert>
							)}
						</div>

						<DrawerFooter>
							<div className="w-full flex flex-col md:flex-row md:justify-end gap-4 md:gap-2">
								<DrawerClose asChild className="order-last md:order-first">
									<Button variant="ghost" disabled={isUploading}>
										Cancel
									</Button>
								</DrawerClose>

								{uploadStep === 1 && (
									<Button
										type="button"
										onClick={() => handleUpload()}
										variant="outline"
										disabled={!file || isUploading}
									>
										{isUploading ? (
											<>
												Uploading...
												<Loader2 className="size-4 animate-spin" />
											</>
										) : (
											"Upload & Preview"
										)}
									</Button>
								)}

								{uploadStep === 2 && (
									<>
										<Button
											type="button"
											onClick={() => {
												setUploadStep(1);
												setUploadedFileData(null);
												setPreviewData(null);
											}}
											variant="outline"
											disabled={isUploading}
										>
											Re-upload File
										</Button>

										<Button
											type="button"
											onClick={() => handleUpload()}
											disabled={!uploadedFileData || isUploading}
										>
											{isUploading ? (
												<>
													Saving...
													<Loader2 className="size-4 animate-spin" />
												</>
											) : (
												`Save ${previewData?.created || 0} Vouchers`
											)}
										</Button>
									</>
								)}
							</div>
						</DrawerFooter>
					</div>
				</div>
			</DrawerContent>
		</Drawer>
	);
}
