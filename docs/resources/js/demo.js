var inputType = "string";
var stepped = 0, rowCount = 0, errorCount = 0, firstError;
var start, end;
var firstRun = true;
var maxUnparseLength = 10000;

$(function()
{
	// Tabs
	$('#tab-string').click(function()
	{
		$('.tab').removeClass('active');
		$(this).addClass('active');
		$('.input-area').hide();
		$('#input-string').show();
		$('#submit').text("Parse");
		inputType = "string";
	});

	$('#tab-local').click(function()
	{
		$('.tab').removeClass('active');
		$(this).addClass('active');
		$('.input-area').hide();
		$('#input-local').show();
		$('#submit').text("Parse");
		inputType = "local";
	});

	$('#tab-remote').click(function()
	{
		$('.tab').removeClass('active');
		$(this).addClass('active');
		$('.input-area').hide();
		$('#input-remote').show();
		$('#submit').text("Parse");
		inputType = "remote";
	});

	$('#tab-unparse').click(function()
	{
		$('.tab').removeClass('active');
		$(this).addClass('active');
		$('.input-area').hide();
		$('#input-unparse').show();
		$('#submit').text("Unparse");
		inputType = "json";
	});



	// Sample files
	$('#remote-normal-file').click(function() {
		$('#url').val($('#local-normal-file').attr('href'));
	});
	$('#remote-large-file').click(function() {
		$('#url').val($('#local-large-file').attr('href'));
	});
	$('#remote-malformed-file').click(function() {
		$('#url').val($('#local-malformed-file').attr('href'));
	});




	// Demo invoked
	$('#submit').click(function()
	{
		if ($(this).prop('disabled') == "true")
			return;

		stepped = 0;
		rowCount = 0;
		errorCount = 0;
		firstError = undefined;

		var config = buildConfig();
		var input = $('#input').val();

		if (inputType == "remote")
			input = $('#url').val();
		else if (inputType == "json")
			input = $('#json').val();

		// Allow only one parse at a time
		$(this).prop('disabled', true);

		if (!firstRun)
			console.log("--------------------------------------------------");
		else
			firstRun = false;



		if (inputType == "local")
		{
			if (!$('#files')[0].files.length)
			{
				alert("解析するファイルを1つ以上選択してください。");
				return enableButton();
			}
			
			$('#files').parse({
				config: config,
				before: function(file, inputElem)
				{
					start = now();
					console.log("ファイルを解析中...", file);
				},
				error: function(err, file)
				{
					console.log("エラー:", err, file);
					firstError = firstError || err;
					errorCount++;
				},
				complete: function()
				{
					end = now();
					printStats("すべてのファイルの処理が完了しました");
				}
			});
		}
		else if (inputType == "json")
		{
			if (!input)
			{
				alert("CSVに変換するために有効なJSON文字列を入力してください。");
				return enableButton();
			}

			start = now();
			var csv = Papa.unparse(input, config);
			end = now();

			console.log("変換が完了しました");
			console.log("時間:", (end-start || "(不明; ブラウザがPerformance APIをサポートしていません)"), "ms");
			
			if (csv.length > maxUnparseLength)
			{
				csv = csv.substr(0, maxUnparseLength);
				console.log("(結果は簡潔性のため切り詰められています)");
			}

			console.log(csv);

			setTimeout(enableButton, 100);	// hackity-hack
		}
		else if (inputType == "remote" && !input)
		{
			alert("ダウンロードして解析するファイルのURLを入力してください。");
			return enableButton();
		}
		else
		{
			start = now();
			var results = Papa.parse(input, config);
			console.log("同期的な結果:", results);
			if (config.worker || config.download)
				console.log("実行中...");
		}
	});

	$('#insert-tab').click(function()
	{
		$('#delimiter').val('\t');
	});
});




function printStats(msg)
{
	if (msg)
		console.log(msg);
	console.log("        時間:", (end-start || "(不明; ブラウザがPerformance APIをサポートしていません)"), "ms");
	console.log("    行数:", rowCount);
	if (stepped)
		console.log("  ステップ数:", stepped);
	console.log("     エラー:", errorCount);
	if (errorCount)
		console.log("最初のエラー:", firstError);
}



function buildConfig()
{
	return {
		delimiter: $('#delimiter').val(),
		header: $('#header').prop('checked'),
		dynamicTyping: $('#dynamicTyping').prop('checked'),
		skipEmptyLines: $('#skipEmptyLines').prop('checked'),
		preview: parseInt($('#preview').val() || 0),
		step: $('#stream').prop('checked') ? stepFn : undefined,
		encoding: $('#encoding').val(),
		worker: $('#worker').prop('checked'),
		comments: $('#comments').val(),
		complete: completeFn,
		error: errorFn,
		download: inputType == "remote"
	};
}

function stepFn(results, parser)
{
	stepped++;
	if (results)
	{
		if (results.data)
			rowCount += results.data.length;
		if (results.errors)
		{
			errorCount += results.errors.length;
			firstError = firstError || results.errors[0];
		}
	}
}

function completeFn(results)
{
	end = now();

	if (results && results.errors)
	{
		if (results.errors)
		{
			errorCount = results.errors.length;
			firstError = results.errors[0];
		}
		if (results.data && results.data.length > 0)
			rowCount = results.data.length;
	}

	printStats("解析が完了しました");
	console.log("        結果:", results);

	// icky hack
	setTimeout(enableButton, 100);
}

function errorFn(err, file)
{
	end = now();
	console.log("エラー:", err, file);
	enableButton();
}

function enableButton()
{
	$('#submit').prop('disabled', false);
}

function now()
{
	return typeof window.performance !== 'undefined'
			? window.performance.now()
			: 0;
}