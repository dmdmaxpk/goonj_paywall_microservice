const mongoose = require('mongoose');
const Category = mongoose.model('Category');

// NOTES:
// cat -> category
// subcat -> subcategory
// Subcategories are removed after the app redesign so the logic can be removed too, haven't removed it in case they change their mind

// CREATE
exports.post = async (req, res) => {

	let query = { _id: req.query.cat_id };
	const { cat_id } = req.query;
	let postData = req.body;

	let result;

	// Following are the two cases for adding category or subcategory
	// 1- If category is provided then add the subcategory to it
	// URL Sample: /category?cat_id=HJlH-7z1m
	if (cat_id) {
		result = await Category.update(
			query,
			{ $push : { sub_categories: postData } }
		);
		
		if (result.nModified == 0) {
			console.log(`No Category with ID: ${cat_id} found!`);
			res.send(`No Category with ID: ${cat_id} found!`);
		}
		else {
			console.log(`SUB-CATEGORY: "${postData.name}" ADDED to ${cat_id}!!`);
			res.send(`SUB-CATEGORY: "${postData.name}" ADDED to ${cat_id}!!`);
		}
	}

	// 2- If no category is provided then add the category
	// URL Sample: /category/add
	else {
		let category = new Category (postData);
		result = await category.save();

		console.log(`CATEGORY: "${postData.name}" ADDED!!`);
		res.send(`CATEGORY: "${postData.name}" ADDED!!`);
	}
	console.log(result);
}

// READ
exports.get = async (req, res) => {

	const { cat_id, subcat_id, cat_name } = req.query;		// cat_id = category id, subcat_id = subcategory id, cat_name = category name (provision for searching on category name)
	let query = {};

	if (cat_id) query._id = cat_id;
	if (cat_name) query.name = cat_name;
	
	let result;

	// Three cases for finding category and subcategories
	// 1- For finding the subcategory of a category
	// URL Sample: /category?cat_id=S1lVrJ2OAz&subcat_id=jds86
	if (cat_id && subcat_id) {
		result = await Category.findOne( query, { sub_categories: { $elemMatch: { _id: subcat_id } } } );
		console.log("-----Finding SubCategory");
		res.send(result.sub_categories[0]);
	}

	// 2- For finding just the category and its subcategories by its category ID or Name
	// URL Sample: /category?cat_id=ahi8a1
	else if (cat_id || cat_name) {
		result = await Category.findOne(query);
		console.log("-----Finding Category");
		res.send(result);
	}

	// 3- If nothing is provided then finding all the categories with their all subcategories
	// URL Sample: /category/view
	else {
		result = await Category.find(query).sort({ name: 1 });	//Sorting by ascending order of the name 
		console.log("-----Finding All categories with subcategories");
		res.send(result);
	}

}

// UPDATE
exports.put = async (req, res) => {

	// 2 use cases: update the category or update the subcat
	const { cat_id, subcat_id } = req.query;
	
	let postBody = req.body;

	let result;

	// 1- If subcat is provided then it will update the subcat
	// URL Sample: /category?cat_id=S1lVr?subcat_id=jds86
	if (cat_id && subcat_id) {

		// Making data obj for Updating all the values submitted
		let updateData = {};
		for (let prop in postBody) {
			updateData[`sub_categories.$.${prop}`] = postBody[prop];
		}

		// Updating the document
		result = await Category.updateOne(
			{ _id: cat_id, "sub_categories._id": subcat_id },	// Finding by _id of cat and the _id of subcat
			updateData											// Updating the whole document of that subcat by new values, $set is default
			// { $set: { "sub_categories.$" : postBody } }		//If we want to replace the whole object, but the id wont be added
		)

		if (result.nModified == 0) {	// Result from mongo 
			console.log(`No Category with ID: ${subcat_id} found!`);
			res.send(`No SubCategory with ID: ${subcat_id} found!`);
		}
		else {
			console.log("SUBCATEGORY UPDATED");
			res.send("SUBCATEGORY UPDATED!!!");
		}
	}
	// 2- If no subcat, update the cat:
	// URL Sample: /category?cat_id=S1lVr
	else {

		result = await Category.update({ _id: cat_id }, postBody);

		if (result.nModified == 0) {
			console.log(`No Category with ID: ${cat_id} found!`);
			res.send(`No Category with ID: ${cat_id} found!`);
		}
		else {
			console.log("CATEGORY UPDATED");
			res.send("CATEGORY UPDATED!!!");
		}
	}
}

// DELETE
exports.delete = async (req, res) => {

	const { cat_id, subcat_id } = req.query;

	let result;
	
	// 1- If subcat is provided then delete that subcat from the cat
	// URL Sample: /category?cat_id=S1lVr&subcat_id=ahud6
	if (subcat_id !== 'undefined') {
		result = await Category.update(
			{ _id: cat_id },
			{ $pull : { sub_categories: { _id: subcat_id } }}
		);

		res.send(`Subcategory removed: ${subcat_id}`);
	}

	// 2- If no subcat, delete the cat:
	// URL Sample: /category?cat_id=S1lVr
	else {
		result = await Category.findOneAndRemove({ _id: cat_id });
		
		if (result) {
			console.log(`Category Deleted: ${cat_id}`);
			res.send(`Category Deleted: ${cat_id}`);
		}
		else {
			console.log("No Category Found!");
			res.send("No Category Found!");
		}
	}
}