class Movie {
    constructor(data) {
        this.id = data.id;
        this.title = data.title;
        this.rating = data.rating || 'N/A';
        this.year = data.year || 'N/A';
        this.genres = data.genres || [];
        this.image = data.image;
        this.link = data.link;
        this.quality = data.quality || null;
        this.type = data.type || 'movie';
        this.episodes = data.episodes || null;
        this.description = data.description || null;
        this.duration = data.duration || null;
        this.views = data.views || null;
    }

    static validate(data) {
        if (!data.title) {
            throw new Error('Title is required');
        }
        if (!data.id && !data.link) {
            throw new Error('Either ID or link is required');
        }
        return true;
    }

    toJSON() {
        const json = {
            id: this.id,
            title: this.title,
            rating: this.rating,
            year: this.year,
            genres: this.genres,
            image: this.image,
            link: this.link,
            type: this.type
        };

        if (this.quality) json.quality = this.quality;
        if (this.episodes) json.episodes = this.episodes;
        if (this.description) json.description = this.description;
        if (this.duration) json.duration = this.duration;
        if (this.views) json.views = this.views;

        return json;
    }
}

module.exports = Movie; 