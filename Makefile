all:
	zip -r about.xpi *
dev:
	GLOBIGNORE=.:..; zip -r about.xpi *; unset GLOBIGNORE
clean:
	rm *.xpi